import { Link } from "react-router-dom";
import PublicPageFrame from "../../components/PublicPageFrame";
import "./ContactPage.css";
import contactHeroImage from "../../assets/public/campus-friends.jpg";

export default function ContactPage() {
  return (
    <PublicPageFrame active="contact">
      <section className="section-shell contact-hero">
        <div className="contact-hero__copy">
          <div className="home-highlight-label">Need assistance?</div>
          <h1 className="contact-hero__title">Contact the support team.</h1>
          <p className="contact-hero__lead">
            Use the support email for report questions, account access help,
            and recovery updates. It is the fastest way to reach the team.
          </p>
        </div>

        <div className="contact-hero__visual">
          <img
            src={contactHeroImage}
            alt="Two students talking while working outdoors on campus"
          />
        </div>
      </section>

      <section className="section-shell contact-info">
        <div className="home-highlight-label">Contact information</div>
        <h2 className="contact-info__title">Support contact.</h2>
        <p className="contact-info__lead">
          Use the contact details below for report questions, account issues,
          verification updates, and recovery guidance.
        </p>

        <div className="contact-card">
          <div className="contact-card__left">
            <div>
              <span className="contact-card__eyebrow">Primary contact</span>
              <a
                href="mailto:lostandfound@hunter.cuny.edu"
                className="contact-card__email"
              >
                lostandfound@hunter.cuny.edu
              </a>
            </div>

            <Link to="/privacy" className="link-arrow contact-card__link">
              Read privacy details
              <span className="link-arrow__icon" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          <div className="contact-card__right">
            <div className="contact-card__details">
              <div className="contact-card__detail">
                <span className="contact-card__label">Office</span>
                <p className="contact-card__value">Hunter College Security Office</p>
              </div>

              <div className="contact-card__detail">
                <span className="contact-card__label">Phone</span>
                <p className="contact-card__value">(201) 555-0148</p>
              </div>

              <div className="contact-card__detail">
                <span className="contact-card__label">Hours</span>
                <p className="contact-card__value">Monday to Friday</p>
                <p className="contact-card__value">9:00 AM — 5:00 PM</p>
              </div>
            </div>

            <a
              href="mailto:lostandfound@hunter.cuny.edu"
              className="home-header__button contact-card__cta"
            >
              <span className="home-header__button-face">Email Support</span>
            </a>
          </div>
        </div>
      </section>
    </PublicPageFrame>
  );
}
