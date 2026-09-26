// @ts-check

const config = {
  title: '3flows Platform',
  tagline: 'YAML-driven services, triggers, and distributed infrastructure for TypeScript applications.',
  favicon: 'img/3flows-mark-3f.png',

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
    image: 'img/3flows-wordmark-blue.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true
    },
    navbar: {
      title: 'Platform',
      logo: {
        alt: '3flows',
        src: 'img/3flows-wordmark-blue.png',
        srcDark: 'img/3flows-wordmark-white.png'
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
      copyright: `© ${new Date().getFullYear()} 3flows GmbH · We build bridges.`
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.oceanicNext,
      additionalLanguages: ['bash', 'typescript', 'yaml', 'json']
    }
  }
};

module.exports = config;
