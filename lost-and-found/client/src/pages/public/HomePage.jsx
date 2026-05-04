import { Link } from "react-router-dom";
import PublicPageFrame from "../../components/PublicPageFrame";
import heroMainImage from "../../assets/public/campus-friends.jpg";
import heroBackdropImage from "../../assets/public/university-facade.jpg";
import spotlightOneImage from "../../assets/public/campus-laptop.jpg";
import spotlightTwoImage from "../../assets/public/hero-students.jpg";
import spotlightThreeImage from "../../assets/public/academic-students.jpg";
import bulletinImage from "../../assets/public/lecture-discussion.jpg";
import academicImage from "../../assets/public/academic-campus.jpg";

export default function HomePage() {
  const spotlightCards = [
    {
      title: "Cleaner reporting",
      text: "Students can describe what they lost quickly without extra friction.",
      image: spotlightOneImage,
      accentClass: "home-spotlight__card--purple",
    },
    {
      title: "Faster follow-up",
      text: "The path from report to updates feels clearer and easier to trust.",
      image: spotlightTwoImage,
      accentClass: "home-spotlight__card--gold",
    },
    {
      title: "Private review",
      text: "Sensitive details stay protected while administrators verify matches.",
      image: spotlightThreeImage,
      accentClass: "home-spotlight__card--muted",
    },
  ];

  const quickFacts = [
    {
      title: "Private matching",
      text: "Item details stay with administrators until ownership is confirmed.",
    },
    {
      title: "Fast reporting",
      text: "Students can submit a report in minutes with the key details included.",
    },
    {
      title: "Clear updates",
      text: "Messages and next steps stay in one place instead of getting lost.",
    },
  ];

  return (
    <PublicPageFrame active="home">
      <section className="section-shell home-hero">
        <div className="home-hero__copy">
          <div className="home-highlight-label">Hunter lost &amp; found</div>
          <h1 className="home-hero__title">Find What Matters.</h1>

          <p className="home-hero__lead">
            A clearer, faster way for Hunter students to report lost items,
            follow updates, and recover what matters.
          </p>

          <div className="home-hero__actions">
            <Link to="/register" className="link-arrow">
              Report an item
              <span className="link-arrow__icon" aria-hidden="true">
                →
              </span>
            </Link>
            <Link to="/login" className="link-arrow">
              Sign in
              <span className="link-arrow__icon" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>

        <div className="home-hero__visual">
          <div className="home-hero__backdrop">
            <img src={heroBackdropImage} alt="A university building facade" />
          </div>
          <div className="home-hero__main-image">
            <img
              src={heroMainImage}
              alt="Two students working together outdoors on campus"
            />
          </div>
          <div className="home-hero__accent-bar" aria-hidden="true"></div>
        </div>

        <div className="home-hero__meta">
          {quickFacts.map((fact) => (
            <div key={fact.title} className="home-hero__meta-item">
              <strong>{fact.title}</strong>
              <span>{fact.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell home-spotlight">
        <div className="home-spotlight__header">
          <div className="home-highlight-label">Spotlight</div>
          <div className="home-spotlight__arrows" aria-hidden="true">
            <span>←</span>
            <span>→</span>
          </div>
        </div>

        <div className="home-spotlight__grid">
          {spotlightCards.map((card) => (
            <article
              key={card.title}
              className={`home-spotlight__card ${card.accentClass}`}
            >
              <div className="home-spotlight__image">
                <img src={card.image} alt={card.title} />
              </div>

              <h2>{card.title}</h2>
              <p>{card.text}</p>

              <Link to="/about" className="link-arrow link-arrow--sm">
                Learn more
                <span className="link-arrow__icon" aria-hidden="true">
                  →
                </span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell">
        <article className="home-bulletin">
          <img
            src={bulletinImage}
            alt="Students taking part in a classroom discussion"
            className="home-bulletin__image"
          />
          <div className="home-bulletin__overlay" aria-hidden="true"></div>

          <div className="home-bulletin__content">
            <div className="home-highlight-label home-highlight-label--light">
              Tracking hub
            </div>
            <h2>Keep reports and updates in one place</h2>
            <p>
              Students can submit a report, check the latest status, and stay
              in contact with administrators without a messy handoff.
            </p>

            <Link to="/login" className="link-arrow link-arrow--light">
              Visit the page
              <span className="link-arrow__icon" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </article>
      </section>

      <section className="section-shell home-academic">
        <div className="home-academic__copy">
          <div className="home-highlight-label">Student reporting experience</div>
          <h2>Move Fast.</h2>
          <p>
            Start a report quickly, share the details that matter, and know
            what happens next.
          </p>

          <Link to="/register" className="link-arrow">
            Create your account
            <span className="link-arrow__icon" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <div className="home-academic__visual">
          <div className="home-academic__image">
            <img src={academicImage} alt="Students attending a lecture" />
          </div>
          <div className="home-academic__accent-bar" aria-hidden="true"></div>
        </div>
      </section>
    </PublicPageFrame>
  );
}
