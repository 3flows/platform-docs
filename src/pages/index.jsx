import clsx from 'clsx';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const features = [
  {
    title: 'YAML-driven platform',
    description: 'Configure services, HTTP, MQ, timers, registries, coordinators, idempotency stores, and discovery from one platform file.'
  },
  {
    title: 'Local or distributed',
    description: 'Keep service code stable while calls resolve locally, through static remotes, or through registry-backed discovery.'
  },
  {
    title: 'Safer async triggers',
    description: 'Use coordinator-backed singleton timers and default idempotency for MQ, email, and SMS triggers.'
  }
];

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">3flows Platform</Heading>
        <p className="hero__subtitle">Build TypeScript services that run as one process or as a distributed platform.</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/getting-started">
            Get started
          </Link>
          <Link className="button button--outline button--secondary button--lg" to="/docs/guides/distributed-platform">
            Distributed guide
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({ title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Layout title="3flows Platform" description="Documentation for the 3flows Platform">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((props, idx) => <Feature key={idx} {...props} />)}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
