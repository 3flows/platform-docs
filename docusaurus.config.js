// @ts-check

const config = {
  title: '3flows Platform',
  tagline: 'YAML-driven services, triggers, and distributed infrastructure for TypeScript applications.',
  favicon: 'img/logo.svg',

  url: 'https://3flows.github.io',
  baseUrl: '/platform-docs/',
  organizationName: '3flows',
  projectName: 'platform-docs',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn'
    }
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: 'docs',
          editUrl: 'https://github.com/3flows/platform-docs/tree/main/'
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ],

  themeConfig: {
    image: 'img/logo.svg',
    navbar: {
      title: '3flows Platform',
      logo: {
        alt: '3flows Platform',
        src: 'img/logo.svg'
      },
      items: [
        { type: 'docSidebar', sidebarId: 'platformSidebar', position: 'left', label: 'Docs' },
        { to: '/docs/getting-started', label: 'Getting Started', position: 'left' },
        { href: 'https://github.com/3flows/platform', label: 'GitHub', position: 'right' }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Configuration', to: '/docs/configuration/overview' },
            { label: 'Distributed Platform', to: '/docs/guides/distributed-platform' }
          ]
        },
        {
          title: 'Community',
          items: [{ label: 'GitHub', href: 'https://github.com/3flows/platform' }]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 3flows.`
    },
    prism: {
      additionalLanguages: ['bash', 'typescript', 'yaml', 'json']
    }
  }
};

module.exports = config;
