'use client';
import MarketChart from '@/app/components/MarketChart';
import AuthBar from "@/app/components/AuthBar";
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
          {/*
          <div className="social-links float-right">
            <a href="#" className="twitter"><i className="fa fa-twitter"></i></a>
            <a href="#" className="facebook"><i className="fa fa-facebook"></i></a>
            <a href="#" className="instagram"><i className="fa fa-instagram"></i></a>
            <a href="#" className="google-plus"><i className="fa fa-google-plus"></i></a>
            <a href="#" className="linkedin"><i className="fa fa-linkedin"></i></a>
          </div>
          */}
        </div>
      </section>

      {/* Header */}
      <header id="header">
        <div className="container">
          <div id="logo" className="pull-left">
            <h1>
              <a href="#body" className="scrollto">
                RedLight<span>GreenLight</span>
              </a>
            </h1>
          </div>

          <nav id="nav-menu-container">
            <ul className="nav-menu">
              <li className="menu-active"><a href="#body">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">S&P 500</a></li>
              {/*<li><a href="#portfolio">Portfolio</a></li>*/} 
              <li><a href="#team">Room 225</a></li>
              {/*
              <li className="menu-has-children">
                <a href="#">Drop Down</a>
                <ul>
                  <li><a href="#">Drop Down 1</a></li>
                  <li><a href="#">Drop Down 3</a></li>
                  <li><a href="#">Drop Down 4</a></li>
                  <li><a href="#">Drop Down 5</a></li>
                </ul>
              </li> */}
              <li><a href="#contact">Contact</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Intro */}
      <section id="intro">
        <div className="intro-content">
          <h2>
            Tomorrow's stock price
            <br /><span>with AI</span>
          </h2>
          <div>
            <a href="#about" className="btn-get-started scrollto">About Our Model</a>
            <a href="#portfolio" className="btn-projects scrollto">Find Stock Values</a>
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
        {/* About */}
        <section id="about" className="wow fadeInUp">
          <div className="container">
            <div className="row">
              <div className="col-lg-6 about-img">
                <img src="/img/about-img.jpg" alt="" />
              </div>
              <div className="col-lg-6 content">
                <h2>Don't overthink it. We already know whats next.</h2>
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

        {/* Market Ticker */}
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
</section>


        {/* Team */}
        <section id="team" className="wow fadeInUp">
          <div className="container">
            <div className="section-header">
              <h2>Room 225</h2>
            </div>
            <div className="row">
              {[
                { name: 'Garrett McKenzie', role: 'AI Architect', img: 'team-1.jpg', GitHub: 'https://github.com/Garrett-Mckenzie', LinkedIn: 'https://www.linkedin.com/in/garrett-mckenzie-09b6242b3/' },
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
                          style={{ borderRight: '1px solid #000023', paddingRight: '10px', marginRight: '10px', color: '#000023' }}
                        >
                          <i className="fa fa-github"></i>
                      </a>

                      <a href={member.LinkedIn} style={{ color: '#000023' }}>
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
