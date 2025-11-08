import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';

const VisitorWalkthrough = ({ userMode, onComplete }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-start only for visitor mode, RestrictedEditor must click button in Settings
  useEffect(() => {
    if (userMode === 'Visitor' || userMode === 'visitor') {
      const hasSeenWalkthrough = localStorage.getItem('visitor_walkthrough_completed');
      if (!hasSeenWalkthrough) {
        // Small delay to ensure page is loaded
        console.log('ðŸŽ“ Auto-starting visitor walkthrough');
        setTimeout(() => setRun(true), 1000);
      } else {
        console.log('âœ… Walkthrough already completed');
      }
    }
    
    // For RestrictedEditor, listen for manual start event
    if (userMode === 'RestrictedEditor') {
      const handleStartTour = () => {
        console.log('ðŸŽ“ RestrictedEditor tour manually started');
        setStepIndex(0);
        setRun(true);
      };
      
      window.addEventListener('start-restricted-tour', handleStartTour);
      return () => window.removeEventListener('start-restricted-tour', handleStartTour);
    }
    
    // Listen for manual restart from button (all modes)
    const handleRestartTour = () => {
      console.log('ðŸŽ“ Walkthrough manually restarted');
      setStepIndex(0);
      setRun(true);
    };
    
    window.addEventListener('restart-walkthrough', handleRestartTour);
    return () => window.removeEventListener('restart-walkthrough', handleRestartTour);
  }, [userMode]);

  // Navigation mapping for walkthrough steps
  // This defines which page each step range should be on
  const stepNavigation = [
    { step: 0, page: '/', label: 'Welcome' },
    { step: 1, page: '/', label: 'Navigation' },
    { step: 2, page: '/', label: 'Dashboard' },
    { step: 3, page: '/locks', label: 'View by Locks' },
    { step: 8, page: '/breakers', label: 'View by Breakers' },
    { step: 15, page: '/personnel', label: 'Personnel' },
    { step: 20, page: '/storage', label: 'Storage' },
    { step: 23, page: '/plans', label: 'Electrical Plans' },
    { step: 27, page: '/settings', label: 'Settings' },
    { step: 32, page: '/about', label: 'About' },
    { step: 35, page: '/', label: 'Final Summary' },
  ];

  const getPageForStep = (step) => {
    // Find the navigation entry for this step (use the last one that's <= current step)
    for (let i = stepNavigation.length - 1; i >= 0; i--) {
      if (step >= stepNavigation[i].step) {
        return stepNavigation[i].page;
      }
    }
    return '/';
  };

  const handleJoyrideCallback = (data) => {
    const { status, action, index, type } = data;

    // Handle step progression
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // Check if we need to navigate to a different page
      const requiredPage = getPageForStep(nextIndex);
      if (requiredPage && location.pathname !== requiredPage) {
        console.log(`ðŸ§­ Navigating to ${requiredPage} for step ${nextIndex}`);
        setRun(false); // Pause tour during navigation
        navigate(requiredPage);
        
        // Resume tour after navigation with small delay
        setTimeout(() => {
          setStepIndex(nextIndex);
          setRun(true);
        }, 800); // 800ms delay for page to load
      } else {
        setStepIndex(nextIndex);
      }
    }

    // Handle tour completion
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      setStepIndex(0);
      localStorage.setItem('visitor_walkthrough_completed', 'true');
      if (onComplete) onComplete();
      // Navigate back to dashboard
      navigate('/');
    }

    // Handle close button
    if (action === ACTIONS.CLOSE && type === EVENTS.TOUR_END) {
      setRun(false);
      setStepIndex(0);
      navigate('/');
    }
  };

  // Define comprehensive walkthrough steps - ALL PAGES, NO CONDITIONALS
  const getSteps = () => {
    const steps = [];
    
    console.log('ðŸ“ Generating ALL walkthrough steps. Current page:', location.pathname, 'Mode:', userMode);

    // STEP 0: Welcome
    steps.push({
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">ðŸ‘‹ Bienvenue dans LOTO Key Management!</h2>
          <p className="text-gray-700">
            Visite guidÃ©e complÃ¨te de l'application.
          </p>
          <p className="text-gray-700 mt-2">
            Cette visite va vous guider Ã  travers <strong>toutes les pages et fonctionnalitÃ©s</strong>.
          </p>
          <p className="text-gray-700 mt-2">
            L'application va automatiquement naviguer vers chaque page!
          </p>
          <p className="text-gray-700 mt-2">
            Mode: <strong>{(userMode === 'Visitor' || userMode === 'visitor') ? 'Visiteur (lecture seule)' : 'Ã‰diteur Restreint (modification)'}</strong>
          </p>
          <p className="text-sm text-blue-600 mt-2">
            ðŸ’¡ Cliquez pour commencer la visite
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
          <h3 className="font-bold mb-2">ðŸ§­ Menu de Navigation</h3>
          <p>Utilisez ce menu pour naviguer entre les pages.</p>
          <p className="mt-2 text-sm text-blue-600">
            ðŸ’¡ La visite va vous guider Ã  travers toutes ces sections automatiquement!
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
          <h3 className="font-bold mb-2">ðŸ“Š Dashboard - Vue d'Ensemble</h3>
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
          <h3 className="text-xl font-bold mb-2">ðŸ”’ Vue par Cadenas</h3>
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
          <h3 className="font-bold mb-2">ðŸ” Recherche de Cadenas</h3>
          <p>Recherchez par nom, numÃ©ro de clÃ©, emplacement, etc.</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: '[data-tour="export-locks"] , button:has(> svg.lucide-download)',
      content: (
        <div>
          <h3 className="font-bold mb-2">ðŸ“¥ Export Excel</h3>
          <p>Exportez toutes les donnÃ©es des cadenas vers Excel.</p>
        </div>
      ),
      placement: 'bottom',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: 'button[title*="Add lock"], [data-tour="add-lock"]',
        content: (
          <div>
            <h3 className="font-bold mb-2">âž• Ajouter un Cadenas</h3>
            <p>En mode Ã‰diteur, vous pouvez ajouter de nouveaux cadenas.</p>
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
          <h3 className="text-xl font-bold mb-2">âš¡ Vue par Disjoncteurs</h3>
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
          <h3 className="font-bold mb-2">ðŸ” Recherche de Disjoncteurs</h3>
          <p>Recherchez par nom, zone, Ã©tat, etc.</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: 'select, [data-tour="filter-zone"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">ðŸ—‚ï¸ Filtres</h3>
          <p>Filtrez par Zone, Sous-zone, Ã‰tat (ON/OFF/Closed).</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: 'button:has(> svg.lucide-download)',
      content: (
        <div>
          <h3 className="font-bold mb-2">ðŸ“¥ Export Excel</h3>
          <p>Exportez les disjoncteurs vers Excel avec toutes les donnÃ©es.</p>
        </div>
      ),
      placement: 'bottom',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: '[data-tour="add-breaker"], button:has(> svg.lucide-plus)',
        content: (
          <div>
            <h3 className="font-bold mb-2">âž• Ajouter un Disjoncteur</h3>
            <p>Ajoutez de nouveaux disjoncteurs au systÃ¨me.</p>
          </div>
        ),
        placement: 'bottom',
      });

      steps.push({
        target: '[data-tour="import-excel-breakers"]',
        content: (
          <div>
            <h3 className="font-bold mb-2">ðŸ“¤ Import Excel</h3>
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
          <h3 className="text-xl font-bold mb-2">ðŸ‘¥ Personnel</h3>
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
          <h3 className="font-bold mb-2">ðŸ” Recherche Personnel</h3>
          <p>Recherchez des employÃ©s par nom, matricule, fonction.</p>
        </div>
      ),
      placement: 'bottom',
    });

    steps.push({
      target: 'button:has(> svg.lucide-download)',
      content: (
        <div>
          <h3 className="font-bold mb-2">ðŸ“¥ Export Excel</h3>
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
            <h3 className="font-bold mb-2">âž• Ajouter Personnel</h3>
            <p>Ajoutez de nouveaux employÃ©s avec leurs documents.</p>
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
          <h3 className="text-xl font-bold mb-2">ðŸ“¦ Stockage</h3>
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
          <h3 className="font-bold mb-2">ðŸ“Š Inventaire des Cadenas</h3>
          <p>Visualisez le stock disponible vs utilisÃ©.</p>
        </div>
      ),
      placement: 'center',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: 'button:contains("Set Total")',
        content: (
          <div>
            <h3 className="font-bold mb-2">âš™ï¸ DÃ©finir le Total</h3>
            <p>Configurez la capacitÃ© totale de stockage.</p>
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
          <h3 className="text-xl font-bold mb-2">ðŸ“‹ Plans Ã‰lectriques</h3>
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
          <h3 className="font-bold mb-2">ðŸ“„ Documents PDF</h3>
          <p>Consultez les plans Ã©lectriques en PDF.</p>
        </div>
      ),
      placement: 'center',
    });

    if (userMode === 'RestrictedEditor') {
      steps.push({
        target: 'button:contains("Upload")',
        content: (
          <div>
            <h3 className="font-bold mb-2">ðŸ“¤ TÃ©lÃ©charger Plan</h3>
            <p>Ajoutez de nouveaux plans Ã©lectriques.</p>
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
          <h3 className="text-xl font-bold mb-2">âš™ï¸ ParamÃ¨tres</h3>
          <p className="text-lg">Navigation vers les paramÃ¨tres...</p>
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
          <h3 className="font-bold mb-2">âš™ï¸ Configuration</h3>
          <p>GÃ©rez les codes d'accÃ¨s et autres paramÃ¨tres.</p>
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
          <h3 className="text-xl font-bold mb-2">â„¹ï¸ Ã€ Propos</h3>
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
          <h3 className="font-bold mb-2">ðŸ‘¨â€ðŸ’» DÃ©veloppeur</h3>
          <p>Informations sur le crÃ©ateur de l'application.</p>
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
          <h3 className="text-xl font-bold mb-2">ðŸŽ‰ Visite TerminÃ©e!</h3>
          <p className="text-lg">Retour au Dashboard...</p>
        </div>
      ),
      placement: 'center',
    });

    steps.push({
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-3">âœ… FÃ©licitations!</h2>
          <p className="text-gray-700 mb-2">
            Vous avez terminÃ© la visite guidÃ©e complÃ¨te!
          </p>
          <p className="text-gray-700 mb-3">
            Vous pouvez cliquer sur le bouton <strong className="text-purple-600">"Aide"</strong> Ã  tout moment pour relancer cette visite.
          </p>
          <p className="text-sm text-blue-600">
            ðŸ’¡ Bonne utilisation de LOTO Key Management!
          </p>
        </div>
      ),
      placement: 'center',
    });

    console.log(`ðŸ“‹ Generated ${steps.length} total steps`);
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
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          zIndex: 10000,
        },
      }}
      locale={{
        back: 'PrÃ©cÃ©dent',
        close: 'Fermer',
        last: 'Terminer',
        next: 'Suivant',
        skip: 'Passer',
      }}
    />
  );
};

export default VisitorWalkthrough;
