'use client';
import AuthBar from "@/app/components/AuthBar";
import Link from "next/link";
export default function HomePage() {
  return (
    <>
      {/* Top Bar */}
      <section id="topbar" className="d-none d-lg-block">
        <div className="container clearfix">
          <div className="contact-info float-left">
            <i className="fa fa-envelope-o"></i>{' '}
            <a href="mailto:redlight.greenlight.ai@gmail.com">
              redlight.greenlight.ai@gmail.com
            </a>
          </div>
          <AuthBar />
        </div>
      </section>

      {/* Header */}
      <header id="header">
        <div className="container">
          <div id="logo" className="pull-left">
            <h1>
              <Link href="#body" className="scrollto">
                RedLight<span>GreenLight</span>
              </Link>
            </h1>
          </div>

          <nav id="nav-menu-container">
            <ul className="nav-menu">
              <li className="menu-active"><a href="#body">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">Getting Started</a></li>
              {/*<li><a href="#portfolio">Portfolio</a></li>*/} 
              <li><a href="#team">Room 225</a></li>
              <li><a href="#contact">Disclamer</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Intro */}
      <section id="home-intro">
        <div className="intro-content">
          <h2>
            Tomorrow's stock price
            <br /><span>with AI</span>
          </h2>
          <div>
            <a href="#services" className="btn-get-started scrollto">Getting Started</a>
            <Link href="/generate_reports" className="btn-projects scrollto">Reports</Link>
          </div>
        </div>

        <div id="intro-carousel" className="owl-carousel">
          {[1,2,3,4,5].map(n => (
            <div
              key={n}
              className="item"
              style={{ backgroundImage: `url(/img/intro-carousel/${n}.jpg)` }}
            />
          ))}
        </div>
      </section>

      <main id="main">
          <div className="container">
            <div className="row justify-content-center">
        <h1 className="text-center pt-5">**The model is in the process of being trained**<br />Until then predictions will be unavailable</h1>
            </div>
          </div>

        {/* About */}
        <section id="about" className="wow fadeInUp">
          <div className="container">
            <div className="row">
              <div className="col-lg-6 about-img">
                <img src="/img/img-10.png" alt="" />
              </div>
              <div className="col-lg-6 content">
                <h2>Don't overthink it. <br/>(That's our job).</h2>
                <h3>
                  Our AI model was built, designed, and tested to predict future stock market values
                </h3>
                <ul>
                  <li><i className="ion-android-checkmark-circle"></i> Ullamco laboris nisi</li>
                  <li><i className="ion-android-checkmark-circle"></i> Duis aute irure dolor</li>
                  <li><i className="ion-android-checkmark-circle"></i> No. It's not a ChatGPT wrapper.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section id="services" className="wow fadeInUp">
          <div className="container">
            <div className="section-header">
              <h2>How to use RedLightGreenLight.AI</h2>
            </div>

            <div className="row justify-content-center">
              <div className="col-lg-10 content">
              <h3>Step 1: Generate a Report</h3>
              <p>Click the <Link href="/generate_reports">Reports</Link> button in the top of the page. This will take you to the report generation page.</p>
              <h3>Step 2: Select Method of Report Creation</h3>
              <p>Choose between an auto-generated report or a custom report. Auto-generated reports use your selected filters and requested score range to find 30 stocks that may be of interest for you. Custom reports allow you to select which specific stocks you want to analyze.</p>
              <h3>Step 3: Watch the Predictions Come in</h3>
              <p>Select up to two reports to be automatically updated weekly. Should new information be released from the SEC, our model will update its prediction for each stock in your report.</p>
              <span><h3>Understanding Score</h3></span>
              <p>Our model assigns a score to each stock based on its predicted performance. This performance is in the range of -100% to 100%
              The lower the score, the more likely the stock value is to decrease in the future. The higher the score, the more likely the value is to increase. 
              The closer to zero, the more uncertain the model is about its future performace.</p>
              </div>
            </div>
          </div>
        </section>


        {/* Team */}
        <section id="team" className="wow fadeInUp">
          <div className="container">
            <div className="section-header">
              <h2>Room 225</h2>
            </div>
            <div className="row">
              {[
                { name: 'Garrett McKenzie', role: 'AI Architect', img: 'team-1.png', GitHub: 'https://github.com/Garrett-Mckenzie', LinkedIn: 'https://www.linkedin.com/in/garrett-mckenzie-09b6242b3/' },
                { name: 'Ethan Bostick', role: 'AI Architect', img: 'team-2.png', GitHub: 'https://github.com/EthanBostick', LinkedIn: 'https://www.linkedin.com/in/ethan-bostick-466717378/' },
                { name: 'Caleb Lineberry', role: 'Full-Stack Developer', img: 'team-3.png', GitHub: 'https://github.com/CalebLineberry', LinkedIn: 'https://www.linkedin.com/in/caleb-lineberry/'  },
              ].map(member => (
                <div key={member.name} className="col-lg-4 col-md-6">
                  <div className="member">
                    <div className="pic">
                      <img src={`/img/${member.img}`} alt={member.name} />
                    </div>
                    <div className="details">
                      <h4>{member.name}</h4>
                      <span>{member.role}</span>
                      
                      <span>
                      <a
                          href={member.GitHub}
                          style={{ borderRight: '1px solid #1d7e0d', paddingRight: '10px', marginRight: '10px', color: '#1d7e0d' }}
                        >
                          <i className="fa fa-github"></i>
                      </a>

                      <a href={member.LinkedIn} style={{ color: '#1d7e0d' }}>
                          <i className="fa fa-linkedin"></i>
                      </a>
                      </span>

                    </div>
                    
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="contact">
          <div className='container'>
            <div className='section-header'>
              <h2>Disclamer</h2>
            </div>
            <div className="content" style={{textAlign: 'center', paddingBottom: '0px'}}>
              <h3><i>Until we get our time machine working, this model is not definite.</i></h3>
              <p>We are not liable for any financial mishaps should the model's predictions be wrong. <span>Please use cautiously.</span></p>
            </div>    
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="footer">
        <div className="container">
          <div className="copyright">
            &copy; Copyright <strong>Room 225</strong>. All Rights Reserved
          </div>
        </div>
      </footer>
    </>
  );
}
