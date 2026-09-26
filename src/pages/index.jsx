import clsx from 'clsx';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const features = [
  {
    eyebrow: 'Configuration',
    title: 'YAML-driven platform',
    description: 'Configure services, HTTP, MQ, timers, registries, coordinators, idempotency stores, and discovery from one platform file.',
    to: '/docs/configuration/overview'
  },
  {
    eyebrow: 'Topology',
    title: 'Local or distributed',
    description: 'Keep service code stable while calls resolve locally, through static remotes, or through registry-backed discovery.',
    to: '/docs/guides/distributed-platform'
  },
  {
    eyebrow: 'Reliability',
    title: 'Safer async triggers',
    description: 'Use coordinator-backed singleton timers and default idempotency for MQ, email, and SMS triggers.',
    to: '/docs/guides/singleton-timers'
  }
];

function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function HomepageHeader() {
  return (
    <header className={styles.hero}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={clsx('container', styles.heroInner)}>
        <div className={styles.accentBar} />
        <div className={styles.eyebrow}>Platform documentation</div>
        <Heading as="h1" className={styles.heroTitle}>
          Services that <span className={styles.highlight}>flow together.</span>
        </Heading>
        <p className={styles.heroSubtitle}>
          Build TypeScript services that run as one process or as a distributed platform — configured from a single YAML file.
        </p>
        <div className={styles.buttons}>
          <Link className={clsx(styles.btn, styles.btnPrimary)} to="/docs/getting-started">
            Get started <Arrow />
          </Link>
          <Link className={clsx(styles.btn, styles.btnGhost)} to="/docs/guides/distributed-platform">
            Distributed guide
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({ eyebrow, title, description, to }) {
  return (
    <div className="col col--4">
      <Link to={to} className={styles.card}>
        <div className={styles.cardEyebrow}>{eyebrow}</div>
        <Heading as="h3" className={styles.cardTitle}>{title}</Heading>
        <p className={styles.cardText}>{description}</p>
        <span className={styles.cardMore}>Read more <Arrow /></span>
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <Layout title="3flows Platform" description="Documentation for the 3flows Platform">
      <HomepageHeader />
      <main className={styles.main}>
        <section className="container">
          <div className={styles.sectionHead}>
            <div className={styles.accentBarSmall} />
            <Heading as="h2" className={styles.sectionTitle}>What the platform gives you</Heading>
            <p className={styles.sectionText}>One runtime, many topologies. Connect services, triggers and infrastructure without rewriting your code.</p>
          </div>
          <div className="row">
            {features.map((props) => <Feature key={props.title} {...props} />)}
          </div>
        </section>
      </main>
    </Layout>
  );
}
