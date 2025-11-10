import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';

const VisitorWalkthrough = ({ userMode, onComplete }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Store original overflow values to restore later
  const originalOverflow = React.useRef({
    body: '',
    html: '',
    scrollBehavior: ''
  });

  // Auto-start only for visitor mode, RestrictedEditor must click button in Settings
  useEffect(() => {
    if (userMode === 'Visitor' || userMode === 'visitor') {
      const hasSeenWalkthrough = localStorage.getItem('visitor_walkthrough_completed');
      if (!hasSeenWalkthrough) {
        // Store original overflow values before starting
        originalOverflow.current.body = document.body.style.overflow;
        originalOverflow.current.html = document.documentElement.style.overflow;
        originalOverflow.current.scrollBehavior = document.documentElement.style.scrollBehavior;
        
        // Small delay to ensure page is loaded
        console.log('🎓 Auto-starting visitor walkthrough');
        setTimeout(() => setRun(true), 1000);
      } else {
        console.log('✅ Walkthrough already completed');
      }
    }
    
    // For RestrictedEditor, listen for manual start event
    if (userMode === 'RestrictedEditor') {
      const handleStartTour = () => {
        console.log('🎓 RestrictedEditor tour manually started');
        setStepIndex(0);
        setRun(true);
      };
      
      window.addEventListener('start-restricted-tour', handleStartTour);
      return () => window.removeEventListener('start-restricted-tour', handleStartTour);
    }
    
    // Listen for manual restart from button (all modes)
    const handleRestartTour = () => {
      console.log('🔄 Walkthrough manually restarted');
      // Store original overflow values
      originalOverflow.current.body = document.body.style.overflow;
      originalOverflow.current.html = document.documentElement.style.overflow;
      originalOverflow.current.scrollBehavior = document.documentElement.style.scrollBehavior;
      
      setStepIndex(0);
      setRun(true);
    };
    
    window.addEventListener('restart-walkthrough', handleRestartTour);
    return () => window.removeEventListener('restart-walkthrough', handleRestartTour);
  }, [userMode]);

  // Navigation mapping for walkthrough steps - SEPARATE FOR EACH MODE
  // Visitor mode: fewer steps (no edit buttons)
  const visitorNavigation = [
    { step: 0, page: '/', label: 'Welcome' },
    { step: 1, page: '/', label: 'Navigation' },
    { step: 2, page: '/', label: 'Dashboard' },
    { step: 3, page: '/locks', label: 'View by Locks' },      // Start locks (3-6)
    { step: 7, page: '/breakers', label: 'View by Breakers' }, // Start breakers (7-13)
    { step: 14, page: '/personnel', label: 'Personnel' },      // Start personnel (14-18)
    { step: 19, page: '/storage', label: 'Storage' },          // Start storage (19-21)
    { step: 22, page: '/plans', label: 'Electrical Plans' },   // Start plans (22-25)
    { step: 26, page: '/settings', label: 'Settings' },        // Start settings (26-28)
    { step: 29, page: '/about', label: 'About' },              // Start about (29-31)
    { step: 32, page: '/', label: 'Final Summary' },           // Return home (32-33)
  ];

  // RestrictedEditor mode: extra steps for edit buttons (+5 steps total)
  const restrictedEditorNavigation = [
    { step: 0, page: '/', label: 'Welcome' },
    { step: 1, page: '/', label: 'Navigation' },
    { step: 2, page: '/', label: 'Dashboard' },
    { step: 3, page: '/locks', label: 'View by Locks' },      // Start locks (3-7, +1 for add button)
    { step: 8, page: '/breakers', label: 'View by Breakers' }, // Start breakers (8-15, +1 for add button)
    { step: 16, page: '/personnel', label: 'Personnel' },      // Start personnel (16-21, +1 for add button)
    { step: 22, page: '/storage', label: 'Storage' },          // Start storage (22-25, +1 for set total button)
    { step: 26, page: '/plans', label: 'Electrical Plans' },   // Start plans (26-30, +1 for upload button)
    { step: 31, page: '/settings', label: 'Settings' },        // Start settings (31-33)
    { step: 34, page: '/about', label: 'About' },              // Start about (34-36)
    { step: 37, page: '/', label: 'Final Summary' },           // Return home (37-38)
  ];

  const getPageForStep = React.useCallback((step) => {
    // Use correct navigation array based on mode
    const stepNavigation = (userMode === 'RestrictedEditor') ? restrictedEditorNavigation : visitorNavigation;
    
    // Find the navigation entry for this step (use the last one that's <= current step)
    for (let i = stepNavigation.length - 1; i >= 0; i--) {
      if (step >= stepNavigation[i].step) {
        return stepNavigation[i].page;
      }
    }
    return '/';
  }, [userMode]);
  
  // Comprehensive scroll restoration function
  const restoreScroll = React.useCallback(() => {
    console.log('🔄 Restoring scroll functionality');
    
    // Restore body
    document.body.style.overflow = originalOverflow.current.body || '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.body.style.width = '';
    
    // Restore html
    document.documentElement.style.overflow = originalOverflow.current.html || '';
    document.documentElement.style.scrollBehavior = originalOverflow.current.scrollBehavior || '';
    
    // Remove any Joyride-added classes or styles
    document.body.classList.remove('joyride-active');
    
    // Remove injected overlay blocker style if it exists
    const styleElement = document.getElementById('walkthrough-overlay-blocker');
    if (styleElement) {
      styleElement.remove();
    }
    
    // Force reflow to ensure styles are applied
    void document.body.offsetHeight;
    
    console.log('✅ Scroll restored');
  }, []);
  
  // Ensure we're on the correct page for the current step
  useEffect(() => {
    if (!run || isNavigating) return;
    
    const requiredPage = getPageForStep(stepIndex);
    if (requiredPage && location.pathname !== requiredPage) {
      console.log(`🔄 Syncing to correct page: ${requiredPage} for step ${stepIndex}`);
      setIsNavigating(true);
      setRun(false);
      navigate(requiredPage);
      
      // Resume tour after navigation
      setTimeout(() => {
        setIsNavigating(false);
        setRun(true);
      }, 500);
    }
  }, [stepIndex, location.pathname, run, navigate, isNavigating, getPageForStep]);
  
  // Restore scroll when component unmounts
  useEffect(() => {
    return () => {
      restoreScroll();
    };
  }, [restoreScroll]);
  
  // Add CSS to block all clicks outside the walkthrough when active
  useEffect(() => {
    if (run) {
      // Inject CSS to ensure overlay blocks all interactions
      const style = document.createElement('style');
      style.id = 'walkthrough-overlay-blocker';
      style.innerHTML = `
        .__floater__open {
          pointer-events: auto !important;
        }
        .react-joyride__overlay {
          pointer-events: all !important;
          cursor: not-allowed;
        }
        .react-joyride__spotlight {
          pointer-events: none !important;
        }
        .react-joyride__tooltip {
          pointer-events: auto !important;
          cursor: default;
        }
        /* Prevent interaction with elements behind the overlay */
        body.joyride-active > *:not(.react-joyride) {
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.body.classList.add('joyride-active');
      
      // Global click blocker as extra safety
      const blockClicks = (e) => {
        const isJoyrideElement = e.target.closest('.react-joyride__tooltip') || 
                                  e.target.closest('.__floater__open') ||
                                  e.target.closest('.react-joyride__overlay');
        
        if (!isJoyrideElement) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('🚫 Blocked click outside walkthrough');
          return false;
        }
      };
      
      // Capture phase to block clicks before they reach any element
      document.addEventListener('click', blockClicks, true);
      document.addEventListener('mousedown', blockClicks, true);
      document.addEventListener('mouseup', blockClicks, true);
      
      return () => {
        // Clean up
        const styleElement = document.getElementById('walkthrough-overlay-blocker');
        if (styleElement) {
          styleElement.remove();
        }
        document.body.classList.remove('joyride-active');
        document.removeEventListener('click', blockClicks, true);
        document.removeEventListener('mousedown', blockClicks, true);
        document.removeEventListener('mouseup', blockClicks, true);
      };
    }
  }, [run]);
  
  const handleJoyrideCallback = (data) => {
    const { status, action, index, type } = data;

    // Handle step progression
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // Check if we need to navigate to a different page
      const requiredPage = getPageForStep(nextIndex);
      console.log(`📍 Step ${index} → ${nextIndex}: Required page: ${requiredPage}, Current page: ${location.pathname}, Mode: ${userMode}`);
      
      if (requiredPage && location.pathname !== requiredPage) {
        console.log(`🧭 Navigation needed! Going to ${requiredPage} for step ${nextIndex}`);
        setIsNavigating(true);
        setRun(false); // Pause tour during navigation
        navigate(requiredPage);
        
        // Resume tour after navigation with small delay
        setTimeout(() => {
          console.log(`✅ Navigation complete. Resuming tour at step ${nextIndex}`);
          setStepIndex(nextIndex);
          setIsNavigating(false);
          setRun(true);
        }, 600); // 600ms delay for page to load
      } else {
        console.log(`✓ Already on correct page (${location.pathname}), moving to step ${nextIndex}`);
        setStepIndex(nextIndex);
      }
    }

    // Handle tour completion
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      setStepIndex(0);
      localStorage.setItem('visitor_walkthrough_completed', 'true');
      
      // Restore scroll functionality completely
      restoreScroll();
      
      if (onComplete) onComplete();
      // Navigate back to dashboard
      setTimeout(() => navigate('/'), 300);
    }

    // Handle close button
    if (action === ACTIONS.CLOSE && type === EVENTS.TOUR_END) {
      setRun(false);
      setStepIndex(0);
      
      // Restore scroll functionality completely
      restoreScroll();
      
      setTimeout(() => navigate('/'), 300);
    }
  };

  // Define comprehensive walkthrough steps - ALL PAGES, NO CONDITIONALS
  const getSteps = () => {
    const steps = [];
    
    console.log('🔍 Generating walkthrough steps for mode:', userMode);
    console.log('📍 Current page:', location.pathname);
    console.log('🎯 Using navigation array:', userMode === 'RestrictedEditor' ? 'RestrictedEditor (with edit buttons)' : 'Visitor (read-only)');

    // STEP 0: Welcome
    steps.push({
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">👋 Bienvenue dans LOTO Key Management!</h2>
          <p className="text-gray-700">
            Visite guidée complète de l'application.
          </p>
          <p className="text-gray-700 mt-2">
            Cette visite va vous guider à travers <strong>toutes les pages et fonctionnalités</strong>.
          </p>
          <p className="text-gray-700 mt-2">
            L'application va automatiquement naviguer vers chaque page!
          </p>
          <p className="text-gray-700 mt-2">
            Mode: <strong>{(userMode === 'Visitor' || userMode === 'visitor') ? 'Visiteur (lecture seule)' : 'Éditeur Restreint (modification)'}</strong>
          </p>
          <p className="text-sm text-blue-600 mt-2">
            💡 Cliquez pour commencer la visite
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    });

    // STEP 1: Navigation Sidebar
    steps.push({
      target: '[data-tour="nav-sidebar"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">🧭 Menu de Navigation</h3>
          <p>Utilisez ce menu pour naviguer entre les pages.</p>
          <p className="mt-2 text-sm text-blue-600">
            💡 La visite va vous guider à travers toutes ces sections automatiquement!
          </p>
        </div>
      ),
      placement: 'right',
    });

    // STEP 2: Dashboard Overview
    steps.push({
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold mb-2">📊 Dashboard - Vue d'Ensemble</h3>
          <p>Le Dashboard affiche les statistiques principales et graphiques.</p>
        </div>
      ),
      placement: 'center',
    });

    // === SECTION: VIEW BY LOCKS ===
    // STEP 3: Navigate to Locks
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">🔒 Vue par Cadenas</h3>
          <p className="text-lg">Navigation vers la page des cadenas...</p>
          <p className="text-sm text-blue-600 mt-2">Cliquez pour continuer</p>
        </div>
      ),
      placement: 'center',
    });

    // STEP 4-7: Locks Page Features
    steps.push({
      target: 'input[type="text"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">🔍 Recherche de Cadenas</h3>
          <p>Recherchez par nom, numéro de clé, emplacement, etc.</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: '[data-tour="export-locks"] , button:has(> svg.lucide-download)',
      content: (
        <div>
          <h3 className="font-bold mb-2">📥 Export Excel</h3>
          <p>Exportez toutes les données des cadenas vers Excel.</p>
        </div>
      ),
      placement: 'bottom',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: 'button[title*="Add lock"], [data-tour="add-lock"]',
        content: (
          <div>
            <h3 className="font-bold mb-2">➕ Ajouter un Cadenas</h3>
            <p>En mode Éditeur, vous pouvez ajouter de nouveaux cadenas.</p>
          </div>
        ),
        placement: 'bottom',
      });
    }

    // === SECTION: VIEW BY BREAKERS ===
    // STEP 8: Navigate to Breakers
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">⚡ Vue par Disjoncteurs</h3>
          <p className="text-lg">Navigation vers la page des disjoncteurs...</p>
          <p className="text-sm text-blue-600 mt-2">Cliquez pour continuer</p>
        </div>
      ),
      placement: 'center',
    });

    // STEP 9-14: Breakers Page Features
    steps.push({
      target: 'input[type="text"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">🔍 Recherche de Disjoncteurs</h3>
          <p>Recherchez par nom, zone, état, etc.</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: 'select, [data-tour="filter-zone"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">🗂️ Filtres</h3>
          <p>Filtrez par Zone, Sous-zone, État (ON/OFF/Closed).</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: 'button:has(> svg.lucide-download)',
      content: (
        <div>
          <h3 className="font-bold mb-2">📥 Export Excel</h3>
          <p>Exportez les disjoncteurs vers Excel avec toutes les données.</p>
        </div>
      ),
      placement: 'bottom',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: '[data-tour="add-breaker"], button:has(> svg.lucide-plus)',
        content: (
          <div>
            <h3 className="font-bold mb-2">➕ Ajouter un Disjoncteur</h3>
            <p>Ajoutez de nouveaux disjoncteurs au système.</p>
          </div>
        ),
        placement: 'bottom',
      });

      steps.push({
        target: '[data-tour="import-excel-breakers"]',
        content: (
          <div>
            <h3 className="font-bold mb-2">📤 Import Excel</h3>
            <p>Importez plusieurs disjoncteurs depuis un fichier Excel.</p>
          </div>
        ),
        placement: 'bottom',
      });
    }

    // === SECTION: PERSONNEL ===
    // STEP 15: Navigate to Personnel
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">👥 Personnel</h3>
          <p className="text-lg">Navigation vers la gestion du personnel...</p>
          <p className="text-sm text-blue-600 mt-2">Cliquez pour continuer</p>
        </div>
      ),
      placement: 'center',
    });

    // STEP 16-19: Personnel Features
    steps.push({
      target: 'input[type="text"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">🔍 Recherche Personnel</h3>
          <p>Recherchez des employés par nom, matricule, fonction.</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: 'button:has(> svg.lucide-download)',
      content: (
        <div>
          <h3 className="font-bold mb-2">📥 Export Excel</h3>
          <p>Exportez la liste du personnel (sans les PDFs).</p>
        </div>
      ),
      placement: 'bottom',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: '[data-tour="add-personnel"]',
        content: (
          <div>
            <h3 className="font-bold mb-2">➕ Ajouter Personnel</h3>
            <p>Ajoutez de nouveaux employés avec leurs documents.</p>
          </div>
        ),
        placement: 'bottom',
      });
    }

    // === SECTION: STORAGE ===
    // STEP 20: Navigate to Storage
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">📦 Stockage</h3>
          <p className="text-lg">Navigation vers l'inventaire...</p>
          <p className="text-sm text-blue-600 mt-2">Cliquez pour continuer</p>
        </div>
      ),
      placement: 'center',
    });

    // STEP 21-22: Storage Features
    steps.push({
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold mb-2">📊 Inventaire des Cadenas</h3>
          <p>Visualisez le stock disponible vs utilisé.</p>
        </div>
      ),
      placement: 'center',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: 'button:contains("Set Total")',
        content: (
          <div>
            <h3 className="font-bold mb-2">⚙️ Définir le Total</h3>
            <p>Configurez la capacité totale de stockage.</p>
          </div>
        ),
        placement: 'bottom',
      });
    }

    // === SECTION: ELECTRICAL PLANS ===
    // STEP 23: Navigate to Plans
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">📋 Plans Électriques</h3>
          <p className="text-lg">Navigation vers les documents...</p>
          <p className="text-sm text-blue-600 mt-2">Cliquez pour continuer</p>
        </div>
      ),
      placement: 'center',
    });

    // STEP 24-26: Plans Features
    steps.push({
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold mb-2">📄 Documents PDF</h3>
          <p>Consultez les plans électriques en PDF.</p>
        </div>
      ),
      placement: 'center',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: 'button:contains("Upload")',
        content: (
          <div>
            <h3 className="font-bold mb-2">📤 Télécharger Plan</h3>
            <p>Ajoutez de nouveaux plans électriques.</p>
          </div>
        ),
        placement: 'bottom',
      });
    }

    // === SECTION: SETTINGS ===
    // STEP 27: Navigate to Settings
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">⚙️ Paramètres</h3>
          <p className="text-lg">Navigation vers les paramètres...</p>
          <p className="text-sm text-blue-600 mt-2">Cliquez pour continuer</p>
        </div>
      ),
      placement: 'center',
    });

    // STEP 28-31: Settings Features
    steps.push({
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold mb-2">⚙️ Configuration</h3>
          <p>Gérez les codes d'accès et autres paramètres.</p>
        </div>
      ),
      placement: 'center',
    });

    // === SECTION: ABOUT ===
    // STEP 32: Navigate to About
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">ℹ️ À Propos</h3>
          <p className="text-lg">Navigation vers les informations...</p>
          <p className="text-sm text-blue-600 mt-2">Cliquez pour continuer</p>
        </div>
      ),
      placement: 'center',
    });

    // STEP 33-34: About
    steps.push({
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold mb-2">👨‍💻 Développeur</h3>
          <p>Informations sur le créateur de l'application.</p>
        </div>
      ),
      placement: 'center',
    });

    // === FINAL SUMMARY ===
    // STEP 35: Back to Dashboard & Summary
    steps.push({
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">🎉 Visite Terminée!</h3>
          <p className="text-lg">Retour au Dashboard...</p>
        </div>
      ),
      placement: 'center',
    });

    steps.push({
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-3">✅ Félicitations!</h2>
          <p className="text-gray-700 mb-2">
            Vous avez terminé la visite guidée complète!
          </p>
          <p className="text-gray-700 mb-3">
            Vous pouvez cliquer sur le bouton <strong className="text-purple-600">"Aide"</strong> à tout moment pour relancer cette visite.
          </p>
          <p className="text-sm text-blue-600">
            💡 Bonne utilisation de LOTO Key Management!
          </p>
        </div>
      ),
      placement: 'center',
    });

    console.log(`📋 Generated ${steps.length} total steps for ${userMode} mode`);
    console.log(`🎯 Expected final step: ${userMode === 'RestrictedEditor' ? '37-38' : '32-33'}`);
    console.log(`✅ Step generation complete`);
    return steps;
  };

  return (
    <Joyride
      steps={getSteps()}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose={true}
      disableCloseOnEsc={false}
      disableScrolling={false}
      disableScrollParentFix={true}
      scrollToFirstStep={true}
      scrollOffset={120}
      spotlightPadding={15}
      hideBackButton={false}
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      debug={true}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          zIndex: 10000,
          arrowColor: '#fff',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          mixBlendMode: 'normal',
        },
        spotlight: {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          border: '2px solid #3b82f6',
        },
        tooltip: {
          borderRadius: 8,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          fontSize: 14,
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 10,
        },
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: {
            filter: 'none',
          },
        },
      }}
      locale={{
        back: 'Précédent',
        close: 'Fermer',
        last: 'Terminer',
        next: 'Suivant',
        skip: 'Passer',
      }}
    />
  );
};

export default VisitorWalkthrough;
