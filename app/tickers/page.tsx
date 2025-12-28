'use client';
import MarketChart from '@/app/components/MarketChart';
import AuthBar from "@/app/components/AuthBar";
import Link from "next/link";
export default function TickersPage() {
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
              <Link href="/" className="scrollto">
                RedLight<span>GreenLight</span>
              </Link>
            </h1>
          </div>

          {/*<nav id="nav-menu-container">
            <ul className="nav-menu">
              <li className="menu-active"><a href="#body">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">S&P 500</a></li>
              {/*<li><a href="#portfolio">Portfolio</a></li>
              <li><a href="#team">Room 225</a></li>
              <li><a href="#contact">Disclamer</a></li>
            </ul>
          </nav> */}
        </div>
      </header>

      {/* Intro */}
      <section id="ticker-intro">
        <div className="intro-content">
          <h2>
            Lets see what
            <br /><span>the future holds</span>
          </h2>
        </div>
      </section>

      <main id="main">

        <section id="search">
            <div className="container">
                <div className="section-header">
                    <h3 style={{textAlign: 'center'}}><i>Enter a company:</i></h3>
                    <label htmlFor="stock-symbol" style={{display: 'block', textAlign: 'center', marginBottom: '10px'}}>e.g. NVDA, AAPL, MSFT,  TSLA</label>
                </div>
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <input type="text" id="stock-symbol" name="stock-symbol" className="form-control" placeholder="Enter stock symbol..." />
                    </div>
                </div>

            </div>
        </section>
        {/* About 
        <section id="about" className="wow fadeInUp">
          <div className="container">
            <div className="row">
              <div className="col-lg-6 about-img">
                <img src="/img/about-img.jpg" alt="" />
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
        </section> */}

        {/* Market Ticker 
<section id="services">
  <div className="container">
    <div className="section-header">
      <h2>S&P 500 Ticker</h2>
    </div>

    <div className="row justify-content-center">
      <div className="col-lg-10">
        <MarketChart symbol="SPY" />
      </div>
    </div>
  </div>
</section> */}


        
        <section id="contact">
          <div className='container'>
            <div className='section-header'>
              <h2>Disclamer</h2>
            </div>
            <div className="content" style={{textAlign: 'center', paddingBottom: '0px'}}>
              <h3><i>Until we get our time machine working, this model is not definite.</i></h3>
              <p>We are not liable for any financial mishaps should the model's predictions be wrong. <span><strong>Please use cautiously.</strong></span></p>
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
