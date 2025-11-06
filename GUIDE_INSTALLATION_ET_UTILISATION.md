# Système de Gestion des Clés LOTO - Guide d'Installation et d'Utilisation

## 📥 Guide d'Installation

### Étape 1 : Télécharger l'Application

1. Accédez à la [page des versions GitHub](https://github.com/your-repo/loto-key-management/releases)
2. Téléchargez la dernière version : `LOTO Key Management Setup X.X.X.exe`
3. Enregistrez le fichier à l'emplacement de votre choix (par ex., dossier Téléchargements)

**[INSÉRER CAPTURE D'ÉCRAN : Page de téléchargement avec le fichier de version]**

---

### Étape 2 : Exécuter l'Installateur

1. Localisez le fichier téléchargé `LOTO Key Management Setup X.X.X.exe`
2. Double-cliquez sur l'installateur pour lancer l'installation

**[INSÉRER CAPTURE D'ÉCRAN : Fichier .exe téléchargé]**

---

### Étape 3 : Contourner la Protection Windows SmartScreen

Lorsque vous exécutez l'installateur, Windows SmartScreen peut afficher un avertissement :

#### ⚠️ **"Windows a protégé votre ordinateur"**

**Ceci est normal pour les nouvelles applications !** L'application est sûre mais n'est pas encore reconnue par le SmartScreen de Microsoft.

**Pour continuer :**

1. Cliquez sur le lien **"Informations complémentaires"** (apparaît en texte bleu)
2. Un nouveau bouton **"Exécuter quand même"** apparaîtra en bas
3. Cliquez sur **"Exécuter quand même"** pour poursuivre l'installation

**[INSÉRER CAPTURE D'ÉCRAN : Avertissement Windows SmartScreen]**

**[INSÉRER CAPTURE D'ÉCRAN : Bouton "Exécuter quand même" après avoir cliqué sur "Informations complémentaires"]**

> **📝 Note :** Cet avertissement apparaît car l'application n'est pas signée numériquement avec un certificat Microsoft coûteux. Votre antivirus peut également analyser le fichier - c'est normal et l'application passera tous les contrôles de sécurité.

---

### Étape 4 : Finaliser l'Installation

1. L'installateur installera automatiquement l'application
2. Attendez que l'installation se termine (généralement 10 à 30 secondes)
3. L'application se lancera automatiquement après l'installation

**[INSÉRER CAPTURE D'ÉCRAN : Progression de l'installation]**

---

### Étape 5 : Premier Lancement

Après l'installation, le Système de Gestion des Clés LOTO s'ouvrira automatiquement.

**[INSÉRER CAPTURE D'ÉCRAN : Fenêtre principale de l'application au premier lancement]**

🎉 **Installation Terminée !** Vous pouvez maintenant commencer à utiliser l'application.

---

## 🔄 Mises à Jour Automatiques

Le Système de Gestion des Clés LOTO inclut la **détection automatique des mises à jour** :

- **Vérification Automatique :** L'application vérifie les mises à jour au lancement (nécessite une connexion internet)
- **Notification :** Si une nouvelle version est disponible, vous verrez une notification de mise à jour
- **Mise à Jour en Un Clic :** Cliquez sur la notification pour télécharger et installer la dernière version
- **Aucune Perte de Données :** Vos données sont préservées en toute sécurité pendant les mises à jour

**[INSÉRER CAPTURE D'ÉCRAN : Bannière de notification de mise à jour]**

> **💡 Astuce :** Gardez toujours votre application à jour pour bénéficier des dernières fonctionnalités, corrections de bugs et améliorations de sécurité !

---

## 👤 Modes Utilisateur

Le Système de Gestion des Clés LOTO dispose de deux modes utilisateur :

### 🔵 Mode Visiteur (Lecture Seule)

**Qui l'utilise :** Techniciens, sous-traitants ou toute personne ayant besoin de consulter les informations sans apporter de modifications.

**Accès :** Aucun code requis - sélectionnez simplement "Visiteur" lorsque demandé.

**Capacités :**
- ✅ Voir tous les états des disjoncteurs et verrous
- ✅ Vérifier l'inventaire des verrous et le stockage
- ✅ Consulter les certifications du personnel
- ✅ Consulter les plans électriques
- ✅ Vérifier l'historique des activités
- ❌ Ne peut pas ajouter, modifier ou supprimer de données
- ❌ Ne peut pas importer/exporter de données

**[INSÉRER CAPTURE D'ÉCRAN : Sélection du mode utilisateur avec Visiteur surligné]**

---

### 🟢 Mode Éditeur (Accès Complet)

**Qui l'utilise :** Personnel autorisé (superviseurs, responsables HSE, ingénieurs électriciens).

**Accès :** Nécessite un **code d'accès à 6 chiffres** fourni par votre administrateur.

**Capacités :**
- ✅ Toutes les fonctionnalités du mode Visiteur
- ✅ Ajouter, modifier et supprimer des disjoncteurs
- ✅ Gérer l'inventaire et les affectations de verrous
- ✅ Ajouter/supprimer des dossiers de personnel
- ✅ Télécharger des certifications et des plans électriques
- ✅ Importer/exporter des données via Excel
- ✅ Configurer les paramètres de l'application

**Types de Modes Éditeur :**
- **Admin Éditeur :** Accès complet à toutes les fonctionnalités
- **Éditeur Restreint :** Mêmes capacités d'édition avec certaines limitations

**[INSÉRER CAPTURE D'ÉCRAN : Sélection du mode utilisateur avec mode Éditeur et saisie du code]**

> **🔒 Note de Sécurité :** Le code d'accès est requis à chaque redémarrage de l'application. Ne partagez jamais votre code d'accès avec du personnel non autorisé.

---

## 📱 Vue d'Ensemble de l'Application

### Barre de Navigation

L'application utilise une **navigation latérale** avec les sections suivantes :

**[INSÉRER CAPTURE D'ÉCRAN : Navigation latérale complète]**

---

## 📖 Guide Page par Page

### 1️⃣ **Accueil (Tableau de Bord)**

**Objectif :** Obtenir un aperçu rapide de l'ensemble de votre système LOTO en un coup d'œil.

**Ce que vous verrez :**
- **Total Disjoncteurs :** Nombre de tous les disjoncteurs enregistrés dans le système
- **Disjoncteurs Fermés :** Nombre de disjoncteurs actuellement en état verrouillé (fermé)
- **Total Verrous :** Capacité de l'inventaire des verrous
- **Verrous en Utilisation :** Combien de verrous sont actuellement affectés aux disjoncteurs
- **Dossiers Personnel :** Nombre total de personnel certifié
- **Plans Électriques :** Nombre de plans électriques téléchargés
- **Statistiques Rapides :** Distribution par zone et activité récente

**Ce que vous pouvez faire :**
- Surveiller l'état du système en temps réel
- Identifier quelles zones ont le plus de disjoncteurs verrouillés
- Suivre la disponibilité de l'inventaire des verrous

**[INSÉRER CAPTURE D'ÉCRAN : Tableau de bord avec cartes de statistiques]**

---

### 2️⃣ **Voir par Disjoncteurs**

**Objectif :** Gérer et surveiller tous les disjoncteurs électriques de votre installation.

**Ce que vous verrez :**
- Tableau complet de tous les disjoncteurs avec colonnes :
  - **Nom :** Identifiant du disjoncteur
  - **Zone :** Zone électrique
  - **Sous-zone :** Subdivision au sein de la zone
  - **Localisation :** Description de l'emplacement physique
  - **État :** Ouvert (disponible) ou Fermé (verrouillé)
  - **Clé Verrou :** Numéro de verrou attribué lorsque fermé
  - **Disjoncteur Général :** Référence du disjoncteur principal
  - **Actions :** Boutons Modifier/Supprimer (mode Éditeur uniquement)

**Options de Filtrage :**
- **Par Zone :** Afficher les disjoncteurs de zones spécifiques
- **Par Localisation :** Filtrer par emplacement physique
- **Par État :** Voir uniquement les disjoncteurs ouverts ou fermés
- **Recherche :** Trouver des disjoncteurs par nom

**Ce que vous pouvez faire (Mode Éditeur) :**
- ➕ **Ajouter Disjoncteur :** Enregistrer de nouveaux disjoncteurs avec zone, localisation et état
- ✏️ **Modifier Disjoncteur :** Mettre à jour les informations ou changer l'état
- 🗑️ **Supprimer Disjoncteur :** Retirer des disjoncteurs du système
- 📊 **Importer depuis Excel :** Téléchargement en masse de disjoncteurs via modèles Excel
- 📥 **Exporter vers Excel :** Télécharger les données des disjoncteurs pour rapports

**[INSÉRER CAPTURE D'ÉCRAN : Page Voir par Disjoncteurs avec tableau et filtres]**

> **💡 Astuce Pro :** Utilisez la fonction d'import Excel pour ajouter rapidement plusieurs disjoncteurs à la fois. Téléchargez d'abord le modèle pour voir le format requis !

---

### 3️⃣ **Voir par Verrous**

**Objectif :** Voir quels disjoncteurs sont actuellement verrouillés (état fermé).

**Ce que vous verrez :**
- Vue filtrée montrant **uniquement les disjoncteurs fermés**
- Mêmes colonnes que "Voir par Disjoncteurs"
- Focus sur les situations actives de verrouillage/étiquetage

**Options de Filtrage :**
- **Par Zone :** Se concentrer sur des zones spécifiques
- **Par Localisation :** Voir les verrous dans des zones particulières
- **Recherche :** Trouver des disjoncteurs verrouillés spécifiques

**Ce que vous pouvez faire :**
- Surveiller les procédures LOTO actives
- Vérifier les affectations de clés de verrou
- Suivre les disjoncteurs verrouillés par zone et sous-zone
- Générer des rapports d'état LOTO

**[INSÉRER CAPTURE D'ÉCRAN : Page Voir par Verrous montrant uniquement les disjoncteurs fermés]**

> **🔐 Note de Sécurité :** Cette page est essentielle pour la conformité LOTO - utilisez-la pour vérifier que tous les disjoncteurs requis sont verrouillés avant les travaux de maintenance.

---

### 4️⃣ **Personnel**

**Objectif :** Gérer les certifications et qualifications du personnel électrique.

**Ce que vous verrez :**
- Tableau de tout le personnel enregistré :
  - **Nom :** Prénom et nom de famille
  - **Carte d'Identité :** Numéro d'identification employé/sous-traitant
  - **Entreprise :** Employeur ou entreprise contractante
  - **Habilitation/Certificat :** Type de qualification avec visionneuse de certificat PDF

**Ce que vous pouvez faire (Mode Éditeur) :**
- ➕ **Ajouter Personnel :** Enregistrer de nouveaux électriciens ou sous-traitants
- ✏️ **Modifier Personnel :** Mettre à jour les informations ou certifications
- 📄 **Télécharger Certificat :** Joindre des certificats PDF (papiers d'habilitation, certificats de formation)
  - **Taille maximale de fichier :** 5 Mo par PDF
- 👁️ **Voir Certificat :** Ouvrir les certificats PDF dans la visionneuse intégrée
- 🗑️ **Supprimer Personnel :** Retirer des dossiers de personnel
- 📊 **Importer depuis Excel :** Téléchargement en masse de données de personnel
- 📥 **Exporter vers Excel :** Télécharger la liste du personnel pour rapports

**Ce que vous pouvez faire (Mode Visiteur) :**
- Voir toutes les informations du personnel
- Vérifier la validité des certificats en consultant les PDF
- Vérifier les qualifications des sous-traitants avant autorisation de travail

**[INSÉRER CAPTURE D'ÉCRAN : Page Personnel avec visionneuse de certificat]**

> **✅ Bonne Pratique :** Vérifiez toujours les certifications du personnel avant d'autoriser les travaux électriques !

---

### 5️⃣ **Plans Électriques**

**Objectif :** Stocker et accéder aux schémas électriques et plans d'installation.

**Ce que vous verrez :**
- Galerie/tableau de tous les plans électriques téléchargés
- Nom du plan, couverture de zone et date de téléchargement
- Options d'aperçu rapide et de téléchargement

**Ce que vous pouvez faire (Mode Éditeur) :**
- ➕ **Télécharger Plan :** Ajouter de nouveaux schémas électriques ou plans d'installation
  - **Taille maximale de fichier :** 15 Mo par PDF
  - Supporte les dessins haute résolution
- ✏️ **Modifier Plan :** Mettre à jour le nom du plan ou les informations de zone
- 👁️ **Voir Plan :** Ouvrir les plans dans la visionneuse PDF intégrée
- 📥 **Télécharger Plan :** Sauvegarder les plans localement pour accès hors ligne
- 🗑️ **Supprimer Plan :** Retirer les plans obsolètes

**Ce que vous pouvez faire (Mode Visiteur) :**
- Voir tous les plans électriques
- Télécharger les plans pour référence sur le terrain
- Consulter les schémas pendant la maintenance

**[INSÉRER CAPTURE D'ÉCRAN : Vue galerie des Plans Électriques]**

> **📐 Note Technique :** Les plans sont synchronisés avec le stockage cloud en ligne, garantissant que votre équipe a toujours accès aux dernières versions.

---

### 6️⃣ **Stockage (Inventaire des Verrous)**

**Objectif :** Gérer et surveiller l'inventaire physique des verrous et leur utilisation.

**Ce que vous verrez :**

**Statistiques d'Inventaire :**
- **Total Verrous :** Capacité totale de votre inventaire de verrous
- **En Utilisation :** Verrous actuellement affectés aux disjoncteurs
- **Disponibles :** Verrous libres en stockage

**Section Verrous par Zone :**
- Vue hiérarchique organisée par :
  - **Zone** → **Sous-zone** → Verrous individuels
- Montre quels disjoncteurs chaque verrou sécurise
- Synchronisation en temps réel avec l'état des disjoncteurs

**Ce que vous pouvez faire (Mode Éditeur) :**
- ⚙️ **Définir Stockage Total :** Configurer la capacité totale de l'inventaire des verrous
- Voir la distribution détaillée des verrous par zone et sous-zone
- Suivre les modèles d'utilisation des verrous

**Ce que vous pouvez faire (Mode Visiteur) :**
- Vérifier la disponibilité des verrous
- Voir quels verrous sont utilisés et où
- Vérifier les affectations verrou-disjoncteur

**[INSÉRER CAPTURE D'ÉCRAN : Page Stockage avec statistiques d'inventaire et regroupement par zone]**

> **📊 Aperçu Inventaire :** Le nombre "Verrous en Utilisation" est automatiquement calculé à partir des disjoncteurs en état "Fermé" avec des clés de verrou attribuées.

---

### 7️⃣ **Historique**

**Objectif :** Piste d'audit de toutes les actions et modifications du système.

**Ce que vous verrez :**
- Journal chronologique de toutes les activités :
  - Ajouts, modifications et suppressions de disjoncteurs
  - Affectations et libérations de verrous
  - Modifications des dossiers de personnel
  - Téléchargements de plans
  - Activités en mode utilisateur

**Informations affichées :**
- **Action :** Ce qui a été fait (par ex., "Disjoncteur ajouté", "Personnel mis à jour")
- **Mode Utilisateur :** Qui a effectué l'action (Admin Éditeur, Éditeur Restreint, Visiteur)
- **Détails :** Informations spécifiques sur le changement
- **Horodatage :** Quand l'action a eu lieu

**Options de Filtrage :**
- Sélection de plage de dates
- Filtrer par type d'action
- Recherche par détails

**[INSÉRER CAPTURE D'ÉCRAN : Page Historique avec journal d'activité]**

> **🔍 Astuce Conformité :** Utilisez la page Historique pour les audits de conformité et pour suivre qui a apporté des modifications aux systèmes de sécurité critiques.

---

### 8️⃣ **À Propos (Paramètres)**

**Objectif :** Voir les informations sur l'application et les détails du développeur.

**Ce que vous verrez :**

**Profil du Développeur :**
- Informations sur le créateur de l'application et contact
- Lien vers le profil LinkedIn
- **Téléchargement CV :** Possibilité de télécharger et voir le CV du développeur (format PDF, max 10 Mo)

**Paramètres de l'Application (Mode Éditeur) :**
- **Informations Entreprise :** Personnaliser le nom de l'entreprise et la marque
- **Texte À Propos :** Personnaliser la description de l'application
- **Contacts Support :** Définir l'email et les numéros de téléphone du support

**Informations Techniques :**
- Version actuelle de l'application
- Technologies utilisées (React, Electron, SQLite, Supabase)
- Exigences système

**[INSÉRER CAPTURE D'ÉCRAN : Page À Propos avec paramètres]**

---

## 🔄 Synchronisation des Données

Le Système de Gestion des Clés LOTO utilise une **architecture hybride base de données cloud + locale** :

### 🌐 **Mode En Ligne (Connecté à Internet)**

- **Synchronisation Automatique :** Toutes les données sont synchronisées avec la base de données cloud Supabase en temps réel
- **Collaboration d'Équipe :** Plusieurs utilisateurs peuvent travailler sur les mêmes données simultanément
- **Sauvegarde Cloud :** Vos données sont sauvegardées en toute sécurité dans le cloud
- **Accès Partout :** Données disponibles depuis n'importe quelle installation de l'application avec les mêmes identifiants

### 💾 **Mode Hors Ligne (Sans Connexion Internet)**

- **Base de Données Locale :** Utilise SQLite pour le stockage local des données
- **Fonctionnalité Complète :** Toutes les fonctionnalités fonctionnent hors ligne (sauf synchronisation cloud)
- **Données Préservées :** Les modifications sont sauvegardées localement et se synchroniseront quand la connexion sera rétablie
- **Récupération Automatique :** Quand internet revient, les modifications locales fusionnent avec les données cloud

**Indicateur d'État de Connexion :**
- **🟢 Point Vert :** Connecté au cloud (mode en ligne)
- **🔴 Point Rouge :** Mode hors ligne - utilisation de la base de données locale

**[INSÉRER CAPTURE D'ÉCRAN : Indicateur d'état en ligne/hors ligne]**

> **⚡ Note de Performance :** L'application fonctionne parfaitement dans les deux modes. Le mode hors ligne est parfait pour le travail sur le terrain dans les zones avec une connectivité limitée !

---

## 📊 Fonctionnalités Import/Export (Mode Éditeur)

### Import Excel

**Objectif :** Téléchargement en masse de données depuis des feuilles de calcul Excel.

**Disponible pour :**
- Disjoncteurs
- Dossiers de personnel
- Inventaire des verrous

**Comment utiliser :**
1. Cliquez sur le bouton **"Importer depuis Excel"**
2. Téléchargez le modèle Excel (première fois)
3. Remplissez vos données en suivant le format du modèle
4. Téléchargez le fichier Excel complété
5. Examinez les erreurs ou avertissements
6. Confirmez l'importation

**[INSÉRER CAPTURE D'ÉCRAN : Dialogue d'import Excel avec téléchargement du modèle]**

### Export Excel

**Objectif :** Télécharger les données pour rapports, sauvegarde ou analyse.

**Disponible pour :**
- Tous les disjoncteurs (avec filtres appliqués)
- Dossiers de personnel
- Inventaire des verrous
- Historique des activités

**Comment utiliser :**
1. Appliquez les filtres que vous souhaitez (facultatif)
2. Cliquez sur le bouton **"Exporter vers Excel"**
3. Le fichier se télécharge automatiquement dans votre dossier Téléchargements
4. Ouvrir avec Microsoft Excel, LibreOffice ou Google Sheets

**[INSÉRER CAPTURE D'ÉCRAN : Bouton d'export et confirmation]**

---

## 🆘 Dépannage

### L'Application ne se Lance pas Après l'Installation

**Solution :**
- Vérifiez si Windows Defender ou l'antivirus a bloqué l'application
- Assurez-vous d'avoir cliqué sur "Exécuter quand même" sur l'avertissement SmartScreen
- Essayez d'exécuter l'installateur en tant qu'Administrateur (clic droit → Exécuter en tant qu'administrateur)

---

### Impossible de Modifier les Données (Boutons Grisés)

**Solution :**
- Vérifiez que vous êtes en **Mode Éditeur** (pas en Mode Visiteur)
- Vérifiez si vous avez entré le code d'accès correct
- Redémarrez l'application et réintégrez le mode Éditeur

---

### Les Modifications ne sont pas Sauvegardées

**Solution :**
- Vérifiez l'état de votre connexion internet (indicateur en haut à droite)
- Si hors ligne, les modifications sont sauvegardées localement et se synchroniseront en ligne
- Vérifiez que vous avez cliqué sur les boutons "Enregistrer" ou "Soumettre"
- Vérifiez la page Historique pour confirmer que l'action a été enregistrée

---

### La Visionneuse PDF ne s'Ouvre pas

**Solution :**
- Assurez-vous que le fichier PDF n'est pas corrompu
- Vérifiez les limites de taille de fichier (5 Mo personnel, 10 Mo CV, 15 Mo plans)
- Essayez de re-télécharger le PDF
- Vérifiez que le chemin du fichier n'a pas changé

---

### Les Données ne se Synchronisent pas Entre les Appareils

**Solution :**
- Assurez-vous que les deux appareils sont connectés à internet
- Vérifiez que vous utilisez les mêmes identifiants Supabase
- Vérifiez les notifications de mise à jour - les anciennes versions peuvent avoir des problèmes de synchronisation
- Contactez le support si le problème persiste

---

## 📞 Support

Pour le support technique, rapports de bugs ou demandes de fonctionnalités :

- **Email :** [Votre email de support]
- **GitHub Issues :** [Page des problèmes du dépôt]
- **Documentation :** Ce guide + CHANGELOG.md pour l'historique des versions

---

## ⚖️ Notes de Sécurité et Conformité

### ⚠️ Informations Importantes de Sécurité

Cette application est un **outil d'assistance** aux procédures LOTO, pas un remplacement pour :
- Une formation LOTO appropriée
- Des dispositifs de verrouillage physiques
- Des procédures et protocoles de sécurité
- Les exigences de conformité réglementaire

### 📋 Utilisation Recommandée

- Vérifiez toujours que le placement physique des verrous correspond aux enregistrements du système
- Effectuez des audits réguliers en utilisant la page Historique
- Maintenez les certifications du personnel à jour
- Suivez les procédures LOTO de votre entreprise en plus d'utiliser cette application
- Mettez à jour les plans électriques lorsque des changements d'installation se produisent

### 🔒 Sécurité des Données

- Les codes d'accès doivent être changés régulièrement
- Ne partagez pas les identifiants du mode Éditeur
- Sauvegardez vos données régulièrement (utilisez l'export Excel)
- Signalez immédiatement tout problème de sécurité

---

## ✅ Liste de Contrôle de Démarrage Rapide

**Pour les Administrateurs (Première Configuration) :**
- [ ] Installer l'application
- [ ] Définir la capacité totale de stockage des verrous
- [ ] Importer ou ajouter manuellement tous les disjoncteurs
- [ ] Ajouter les dossiers de personnel avec certifications
- [ ] Télécharger les plans électriques
- [ ] Définir les codes d'accès pour les utilisateurs Éditeurs
- [ ] Configurer les informations de l'entreprise dans les Paramètres

**Pour les Utilisateurs Quotidiens :**
- [ ] Lancer l'application et sélectionner le mode utilisateur approprié
- [ ] Vérifier le Tableau de Bord pour l'état actuel
- [ ] Mettre à jour les états des disjoncteurs lors des procédures LOTO
- [ ] Vérifier que les affectations de verrous correspondent aux verrous physiques
- [ ] Documenter tout changement ou maintenance dans les notes
- [ ] Exporter les rapports si nécessaire

---

## 🎓 Ressources de Formation

**Sujets de Formation Recommandés :**
1. Navigation de base et modes utilisateur
2. Ajout et mise à jour des informations des disjoncteurs
3. Gestion de l'inventaire des verrous
4. Téléchargement et consultation des certifications du personnel
5. Utilisation des fonctionnalités d'import/export
6. Lecture du journal Historique pour les audits
7. Travailler en mode hors ligne

**Temps d'Apprentissage Estimé :**
- Utilisateur de base (mode Visiteur) : 15-30 minutes
- Utilisateur éditeur : 1-2 heures
- Administrateur : 2-3 heures

---

**Version :** 1.7.1  
**Dernière Mise à Jour :** Janvier 2025  
**Langue du Document :** Français

---

© 2025 Système de Gestion des Clés LOTO. Tous droits réservés.
