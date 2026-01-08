import re
import gc
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm
import signal

#####################################
#doc grabber and cleaner function, called concurrently
networkLock = threading.Lock()
def downloadAndClean(args):
	aNum, curCIK,headers = args
	aPath = aNum.replace('-', '').strip()
	url = f"https://www.sec.gov/Archives/edgar/data/{curCIK}/{aPath}/{aNum}.txt"
	max_retries = 5
	backoff = 2 # seconds
	
	for attempt in range(max_retries):
		try:
			with networkLock:
				time.sleep(0.11) # Slightly more than 0.1 for safety
				response = requests.get(url, headers=headers)
			
			if response.status_code == 429:
				print("Rate limit hit (429). Backing off...")
				time.sleep(10)
				continue
				
			response.raise_for_status() #raise error if problem
			raw_text = response.text
			#processing
			doc_blocks = re.findall(r'<DOCUMENT>(.*?)</DOCUMENT>', raw_text, re.DOTALL | re.IGNORECASE)

			total = ""
			for block in doc_blocks:
				# We check the <TYPE> tag inside the block before giving it to BeautifulSoup
				type_match = re.search(r'<TYPE>(.*?)\n', block, re.IGNORECASE)
				doc_type = type_match.group(1).strip().upper() if type_match else ""
				
				# JUNNNK
				junk = ["GRAPHIC", "ZIP", "EXCEL", "PDF", "JPG", "XML", "JSON", "XSD", "CSS", "JS"]
				if any(x in doc_type for x in junk):
					continue # Skip the memory-heavy junk

				soup = BeautifulSoup(block, 'lxml')
				raw_text = soup.get_text(separator=' ', strip=True)
				# Use two spaces to replace newlines to keep some structural separation
				clean_text = re.sub(r'[\r\n\t]+', '  ', raw_text) 
				# Then collapse any remaining massive gaps (3+ spaces) into just 2 spaces
				clean_text = re.sub(r'\s{3,}', '  ', clean_text).strip()
				
				total = total + clean_text + " "
				del soup
			del response
			gc.collect()
			return total
		except (requests.exceptions.RequestException, Exception) as e:
			if attempt < max_retries - 1:
				time.sleep(backoff * (attempt + 1)) # Exponential backoff
				continue
			else:
				print(f"Failed to get {aNum} after {max_retries} attempts: {e}")
				return None
#######################################

#EXPECTS: some sort of formated list of tickers each with its cik and its last date updated
#!!! CIK Format: cik must be a string with 10 total digits, left fill zeros if not ten digits
#get the new documents for those tickers
data = {'ticker': ['NVDA','AAPL','GOOGL'],'cik':['0001045810','0000320193','0001652044'],'upWhen':['12/01/2025','12/01/2025','12/01/2025']}
ticks = pd.DataFrame(data)
try:
	ticks['upWhen'] = pd.to_datetime(ticks['upWhen'],format="%m/%d/%Y")
except Exception as e:
	ticks['upWhen'] = pd.to_datetime(ticks['upWhen'],format="%m/%d/%Y")

#header for sec api call
headers = {'User-Agent': "redlight.greenlight.ai@gmail.com"} #type, contact info
#API LIMITS: 10 requests per second

#forms we want
keepForms = {
	'10-K', '10-K405', '10-Q', 'S-1', 'S-1/A', '8-K', '8-K/A', 
	'ARS', 'S-4', 'S-4/A', 'DEF 14A', '424B4', '425', '424B2',
	'424B5', 'DEFR14A'
}

#tickers we actually got new files for
tickersWithNew = []

################################
# GETTING THE FILE LINKS
for i in range(len(ticks['cik'])):
	curTicker = ticks['ticker'].iloc[i]
	curCIK = ticks['cik'].iloc[i]
	curUp = ticks['upWhen'].iloc[i]

#get all RECENT files in a df
	filingData = requests.get(f'https://data.sec.gov/submissions/CIK{curCIK}.json',headers=headers)
	filingData = filingData.json()
	recent = filingData['filings']['recent']
	recentDf = pd.DataFrame.from_dict(recent)
	#filter forms
	recentDf = recentDf[recentDf['form'].isin(keepForms)]
	#date magic
	try:
		recentDf['filingDate'] = pd.to_datetime(recentDf['filingDate'],format="%Y-%m-%d")
	except Exception as e:
		recentDf['filingDate'] = pd.to_datetime(recentDf['filingDate'],format="mixed",errors='coerce')

	allFiles = recentDf
#get old files if last recent is newer than the update date
	if curUp <= recentDf['filingDate'].iloc[-1]:	
		#not always other files
		if(len(filingData['filings']['files'])>0):
			#may be more than one file location of old files(most of the time not)
			for files in filingData['filings']['files']:
				name = filingData['filings']['files'][0]['name']
				oldFiles = requests.get(f"https://data.sec.gov/submissions/{name}",headers=headers)
				oldFiles = oldFiles.json()
				oldDf = pd.DataFrame.from_dict(oldFiles)
				oldDf = olfDf[oldDf['form'].isin(keepForms)]
				try:
					oldDf['filingDate'] = pd.to_datetime(oldDf['filingDate'],format="%Y-%m-%d")
				except Exception as e:
					oldDf['filingDate'] = pd.to_datetime(oldDf['filingDate'],format="mixed",errors='coerce')
				allFiles = pd.concat([allFiles, oldDf], axis=0, ignore_index=True)

#final filter based on last update
	allFiles = allFiles[allFiles['filingDate']>=curUp]

	#oldest at top newest at bottom (flip the burger)
	allFiles = allFiles.iloc[::-1].reset_index(drop=True)
	time.sleep(0.2) # for both api calls

# END GETTING FILE LINKS
#################################
# START READING FILES
	if len(allFiles['filingDate']) == 0:
		continue #skip if no new files
	#concurrent tasks
	tasks = [(aNum, curCIK, headers) for aNum in allFiles['accessionNumber']]
	
#max workers should not go above 10
	with ThreadPoolExecutor(max_workers=5) as executor:
		try:
			#uses mapping to insert documents at correct position in file
			results = list(tqdm(
				executor.map(downloadAndClean, tasks), 
				total=len(tasks), 
				desc=f"Downloading {curTicker}", 
				leave=False
			))
			
			with open(f'{curTicker}_docs.txt', 'w') as f:
				for text in results:
					if text:
						f.write(text)
						f.write('\n[EOD]\n')
				f.write('[EOF]')
				
		except KeyboardInterrupt:
			executor.shutdown(wait=False, cancel_futures=True)
			raise # Pass to the outer handler to save progress

	# create the corresponding file with dates
#create the corresponding file with dates
	allFiles['filingDate'].to_csv(f'{curTicker}_dates.txt', index=False, header=False)
	tickersWithNew.append(curTicker)
################
	#loop again for next ticker
print(tickersWithNew)



