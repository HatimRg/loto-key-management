# 🎓 RestrictedEditor Walkthrough Implementation

## Summary of Changes

### ✅ What Was Implemented

1. **Auto-start behavior changed:**
   - **Visitor**: Walkthrough starts automatically on first login
   - **RestrictedEditor**: Walkthrough only starts when button is clicked in Settings

2. **RestrictedEditor-specific steps added for:**
   - **Adding** new items (Breakers, Personnel)
   - **Importing** from Excel templates
   - **Editing** existing records
   - Explanation of form fields and requirements

3. **Data-tour attributes added:**
   - `data-tour="add-breaker"` - Add Breaker button
   - `data-tour="download-template-breakers"` - Download Template button (Breakers)
   - `data-tour="import-excel-breakers"` - Import Excel button (Breakers)
   - `data-tour="add-personnel"` - Add Personnel button
   - `data-tour="download-template-personnel"` - Download Template button (Personnel)
   - `data-tour="import-excel-personnel"` - Import Excel button (Personnel)

---

## How It Works

### For Visitors:
1. Login as Visitor
2. Walkthrough **starts automatically** after 1 second
3. Shows basic navigation and viewing features
4. Can restart from Settings → "Redémarrer la Visite"

### For RestrictedEditor:
1. Login as RestrictedEditor
2. **No automatic walkthrough**
3. Go to Settings → "Visite Guidée" section
4. Click **"Démarrer la Visite"** button
5. Tour starts immediately with editor-specific steps
6. Shows how to:
   - Add new breakers/personnel
   - Download Excel templates
   - Import data from Excel
   - Edit existing records

---

## RestrictedEditor Tour Content

### ViewByBreakers Page:

#### Step 1: Add Breaker Button
**Target:** `[data-tour="add-breaker"]`
```
➕ Ajouter un Disjoncteur
Cliquez sur ce bouton pour ajouter un nouveau disjoncteur.

Un panneau s'ouvrira avec les champs suivants:
- Nom: Nom du disjoncteur
- Zone: Zone d'installation
- Sous-zone: Sous-zone (optionnel)
- Localisation: Emplacement physique
- État: ON, OFF, ou Closed
- Clé: Numéro de clé (si verrouillé)
- Disjoncteur Général: Lien parent (optionnel)

✅ En mode Éditeur Restreint, vous pouvez ajouter et modifier des données.
```

#### Step 2: Download Template Button
**Target:** `[data-tour="download-template-breakers"]`
```
📄 Télécharger le Modèle
Ce bouton télécharge un fichier Excel modèle pour l'importation en masse.

Étapes d'importation:
1. Téléchargez le modèle Excel
2. Remplissez les colonnes avec vos données
3. Respectez le format exact (colonnes obligatoires)
4. Cliquez sur "Import Excel" pour charger le fichier

💡 Le modèle contient des instructions détaillées.
```

#### Step 3: Import Excel Button
**Target:** `[data-tour="import-excel-breakers"]`
```
📤 Importer depuis Excel
Utilisez ce bouton pour importer plusieurs disjoncteurs en une fois.

Format requis:
- Fichier .xlsx ou .xls
- Colonnes obligatoires: Date, Breaker Name, Zone, Location, State
- Colonnes optionnelles: Subzone, Specifique Area, Key Number, General Breaker

⚠️ Les erreurs de format seront signalées et un rapport sera généré.
```

#### Step 4: Edit Button
**Target:** `button[title*="Edit"]`
```
✏️ Modifier un Disjoncteur
Ce bouton ouvre le panneau d'édition pour modifier les informations.

Que pouvez-vous modifier?
- Nom du disjoncteur
- Zone et sous-zone
- Localisation
- État (ON/OFF/Closed)
- Numéro de clé
- Disjoncteur général

✅ Cliquez pour ouvrir le panneau et voir tous les champs.
```

### Personnel Page:

#### Step 1: Add Personnel Button
**Target:** `[data-tour="add-personnel"]`
```
➕ Ajouter du Personnel
Cliquez sur ce bouton pour ajouter un nouvel employé.

Un panneau s'ouvrira avec les champs suivants:
- Prénom: Prénom de l'employé
- Nom: Nom de famille
- Carte d'Identité: Numéro de carte
- Entreprise: Société employeur
- Habilitation: Type de certification
- Certificat PDF: Document de certification (optionnel)

✅ Vous pouvez téléverser un fichier PDF comme preuve de certification.
```

#### Step 2: Import Excel Button
**Target:** `[data-tour="import-excel-personnel"]`
```
📤 Importer Personnel depuis Excel
Utilisez ce bouton pour importer plusieurs employés en une fois.

Format requis:
- Fichier .xlsx ou .xls
- Colonnes obligatoires: First Name, Last Name, Company, Habilitation
- Colonne optionnelle: ID Card

💡 Téléchargez d'abord le modèle pour voir le format exact.
```

#### Step 3: Edit Personnel Button
**Target:** `button[title*="Edit personnel"]`
```
✏️ Modifier un Employé
Ce bouton ouvre le panneau d'édition pour modifier les informations personnelles.

Que pouvez-vous modifier?
- Prénom et nom
- Carte d'identité
- Entreprise
- Type d'habilitation
- Certificat PDF (ajouter ou remplacer)

✅ Cliquez pour ouvrir le panneau et voir tous les champs modifiables.
```

---

## Technical Implementation

### Files Modified:

1. **`VisitorWalkthrough.js`**
   - Added RestrictedEditor-specific conditional steps
   - Changed auto-start logic (only visitors)
   - Added event listener for 'start-restricted-tour'
   - Updated selectors to use data-tour attributes

2. **`Settings.js`**
   - Modified button onClick handler
   - Visitor: Clears localStorage + reloads
   - RestrictedEditor: Dispatches event + starts tour immediately

3. **`ViewByBreakers.js`**
   - Added `data-tour="add-breaker"`
   - Added `data-tour="download-template-breakers"`
   - Added `data-tour="import-excel-breakers"`

4. **`Personnel.js`**
   - Added `data-tour="add-personnel"`
   - Added `data-tour="download-template-personnel"`
   - Added `data-tour="import-excel-personnel"`

### Event System:

**Settings Button Click:**
```javascript
if (userMode === 'visitor') {
  // Visitor: Clear localStorage and reload
  localStorage.removeItem('visitor_walkthrough_completed');
  showToast('✓ Visite guidée redémarrée! Rechargez la page pour commencer.', 'success');
  setTimeout(() => window.location.reload(), 1500);
} else {
  // RestrictedEditor: Dispatch event to start tour immediately
  localStorage.removeItem('visitor_walkthrough_completed');
  showToast('✓ Visite guidée démarrée!', 'success');
  setTimeout(() => {
    window.dispatchEvent(new Event('start-restricted-tour'));
  }, 500);
}
```

**VisitorWalkthrough Listener:**
```javascript
if (userMode === 'RestrictedEditor') {
  const handleStartTour = () => {
    console.log('🎓 RestrictedEditor tour manually started');
    setRun(true);
  };
  
  window.addEventListener('start-restricted-tour', handleStartTour);
  return () => window.removeEventListener('start-restricted-tour', handleStartTour);
}
```

---

## Testing Steps

### Test Visitor Mode:
1. Login as Visitor
2. **✅ Tour should start automatically**
3. Navigate through all steps
4. Complete tour
5. Reload page → **Tour should NOT start again**
6. Go to Settings → Click "Redémarrer la Visite"
7. **✅ Page reloads and tour starts**

### Test RestrictedEditor Mode:
1. Login as RestrictedEditor
2. **✅ Tour should NOT start automatically**
3. Navigate around normally
4. Go to Settings → "Visite Guidée" section
5. Click **"Démarrer la Visite"** button
6. **✅ Toast appears: "Visite guidée démarrée!"**
7. **✅ Tour starts immediately** (no reload needed)
8. Navigate to ViewByBreakers
9. **✅ Should see Add/Import/Template button steps**
10. Navigate to Personnel
11. **✅ Should see Personnel-specific steps**
12. Complete tour

### Verify Data-Tour Attributes:
Open DevTools and check:
```javascript
// ViewByBreakers
document.querySelector('[data-tour="add-breaker"]')
document.querySelector('[data-tour="download-template-breakers"]')
document.querySelector('[data-tour="import-excel-breakers"]')

// Personnel
document.querySelector('[data-tour="add-personnel"]')
document.querySelector('[data-tour="download-template-personnel"]')
document.querySelector('[data-tour="import-excel-personnel"]')
```

---

## User Experience

### Visitor:
- 👍 Automatic walkthrough on first login
- 👍 Can restart from Settings
- 👍 Sees basic viewing features
- 👍 No editing steps shown

### RestrictedEditor:
- 👍 No interruption on first login
- 👍 Manual control via Settings button
- 👍 Immediate start (no reload)
- 👍 Sees editing-specific steps
- 👍 Learns how to add, import, edit
- 👍 Form field explanations included

### AdminEditor:
- 👍 Never shows walkthrough (as intended)
- 👍 Gets special training from you

---

## Benefits

1. **No Auto-Start Annoyance** for RestrictedEditor
2. **On-Demand Learning** when they need it
3. **Editor-Specific Training** for actual workflows
4. **Form Field Guidance** reduces errors
5. **Template Download Instructions** clear and detailed
6. **Import Process Explained** step-by-step

---

## Future Enhancements

Possible additions:
- [ ] Multi-language support (English)
- [ ] Video tutorials embedded
- [ ] Interactive form demo (actually fill fields)
- [ ] Progress tracking (5/10 steps completed)
- [ ] Bookmarks (save progress mid-tour)
- [ ] Search within walkthrough
- [ ] Print walkthrough to PDF

---

## 🎉 Complete!

RestrictedEditor now has:
- ✅ Manual tour activation
- ✅ Editor-specific content
- ✅ Add/Import/Edit guidance
- ✅ Form field explanations
- ✅ No automatic interruption

**Perfect for training new editors without annoying experienced ones!**
