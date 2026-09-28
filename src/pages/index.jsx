import clsx from 'clsx';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const serviceCode = `@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment,
            async (input, trigger) => {
                const { doc, sms } = trigger.context;
                const appointment = { id: randomUUID(), ...input };

                await doc().collection('appointments')
                    .by(appointment.id).set(appointment);

                await sms().to(appointment.phone)
                    .body('Your appointment is confirmed.').send();

                await trigger.ok(appointment);
            })
    ];
}`;

const yamlCode = `services:
  - name: AppointmentsService

https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService

docs:
  - name: DEFAULT
    type: memory   # mongo, postgres

smss:
  - name: DEFAULT
    type: memory   # twilio`;

const points = [
  {
    title: 'Encoded experience',
    description:
      'docs, kv, blobs, mq, sms and timers backed by implementations that have already gone the full road to production with our customers.'
  },
  {
    title: 'A shared language',
    description:
      'Agents write the code. Humans read it, review it and take responsibility for it, in the same small vocabulary.'
  },
  {
    title: 'Portable by configuration',
    description:
      'Memory in development, MongoDB, Redis or Twilio in production. Even one process or several. The code stays the same.'
  }
];

const journey = [
  { step: '0', label: 'Hello World', to: '/docs/tutorial/hello-world' },
  { step: '2', label: 'Store data', to: '/docs/tutorial/store-appointments' },
  { step: '4', label: 'Timers', to: '/docs/tutorial/send-reminders' },
  { step: '6', label: 'Queues', to: '/docs/tutorial/dont-block-booking' },
  { step: '7', label: 'Two services', to: '/docs/tutorial/notifications-service' },
  { step: '9', label: 'Ontology', to: '/docs/tutorial/ontology' },
  { step: '10', label: 'GraphQL', to: '/docs/tutorial/graphql' },
  { step: '13', label: 'Pipelines', to: '/docs/tutorial/pipelines' },
  { step: '16', label: 'Lineage', to: '/docs/tutorial/medallion-and-lineage' },
  { step: '17', label: 'Flows', to: '/docs/tutorial/flows' },
  { step: '19', label: 'Admin API', to: '/docs/tutorial/admin-api' },
  { step: '21', label: 'Discovery', to: '/docs/tutorial/discovery' }
];

function Hero() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          Simple primitives your team can read, review and own.
        </Heading>
        <p className="hero__subtitle">
          Write business logic once with a few platform primitives. Decide in YAML how it runs.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/tutorial">
            Start the tutorial
          </Link>
          <Link className="button button--outline button--secondary button--lg" to="/docs/why">
            Why 3flows Platform
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout title="3flows Platform" description="Simple primitives your team can read, review and own.">
      <Hero />
      <main>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h2" className={styles.center}>This is a complete service</Heading>
            <p className={styles.center}>
              Book an appointment, store it and confirm it by SMS, with no database driver or SMS SDK in sight.
            </p>
            <div className="row">
              <div className="col col--7">
                <CodeBlock language="ts" title="appointments.ts">{serviceCode}</CodeBlock>
              </div>
              <div className="col col--5">
                <CodeBlock language="yaml" title="platform.yml">{yamlCode}</CodeBlock>
              </div>
            </div>
          </div>
        </section>

        <section className={clsx(styles.section, styles.alt)}>
          <div className="container">
            <div className="row">
              {points.map(({ title, description }) => (
                <div key={title} className="col col--4">
                  <Heading as="h3">{title}</Heading>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <Heading as="h2" className={styles.center}>From Hello World to a data hub in several processes</Heading>
            <p className={styles.center}>
              One small app, one new concept per chapter. More and more chapters need no code changes, only YAML.
            </p>
            <div className={styles.journey}>
              {journey.map(({ step, label, to }) => (
                <Link key={step} to={to} className={styles.journeyItem}>
                  <span className={styles.journeyStep}>{step}</span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
            <div className={styles.buttons}>
              <Link className="button button--primary button--lg" to="/docs/tutorial">
                Start the tutorial
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
