import React from 'react';
import { APP_CONFIG } from '../utils/constants';

// ⚡ PERFORMANCE: Memoize Footer to prevent unnecessary re-renders
const Footer = React.memo(() => {
  return (
    <div className="text-center py-4">
      <a
        href="https://www.linkedin.com/in/hatim-raghib-5b85362a5/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-all group cursor-pointer"
      >
        <img 
          src="./icon.jpg"
          alt="Developer" 
          className="w-5 h-5 rounded-full object-cover group-hover:ring-2 group-hover:ring-blue-500 transition-all"
        />
        <span>Made by {APP_CONFIG.author}</span>
      </a>
    </div>
  );
});

Footer.displayName = 'Footer';

export default Footer;
