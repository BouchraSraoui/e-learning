# Guide du manager
URL: /admin/courses
Audience: manager

Ce que fait un manager sur la plateforme — la navigation vous ajoute un menu « Gérer » avec deux entrées : « Cours » (/admin/courses) et « Rapports » (/admin/reports). Vous y créez et publiez des formations, vous les affectez à votre équipe et vous suivez son avancement. Le reste de la plateforme fonctionne pour vous comme pour un apprenant.

Ce qu'un manager ne peut pas faire, contrairement à un administrateur — son menu « Gérer » ne contient ni « Utilisateurs » ni « Statistiques », et l'URL directe affiche « Accès refusé ». L'onglet « Journal d'audit » des rapports n'apparaît pas non plus. Vous ne modifiez et ne supprimez que les cours dont vous êtes l'auteur : l'éditeur refuse ceux des autres.

Retrouver vos cours — ouvrez « Gérer » puis « Cours » (/admin/courses). Pour un manager, la liste ne contient que les cours que vous avez créés. Filtrez avec « Rechercher un cours… », « Tous les niveaux » et « Tous les statuts » (« Publié » ou « Brouillon »). Le tableau affiche « Titre du cours », « Niveau », « Structure », « Statut » et « Actions ».

Publier, prévisualiser ou supprimer un cours — sur chaque ligne de /admin/courses, « Publier » ou « Dépublier » bascule aussitôt sa visibilité dans le catalogue. L'icône œil « Aperçu de la formation » ouvre la fiche publique, le crayon « Modifier le contenu » ouvre l'éditeur, la corbeille supprime le cours avec ses chapitres, leçons et quiz.

Créer un cours — cliquez sur « Nouveau cours » depuis /admin/courses pour ouvrir /admin/courses/new, un « Créateur de cours » plein écran en quatre étapes : « Détails », « Programme », « Quiz » et « Révision », avec « Retour » et « Suivant » en pied de page. « Quitter » ramène à la liste des cours.

Étape « Détails » — renseignez « Titre du cours » et « Description », tous deux obligatoires, puis « Catégorie » et « Niveau » (Débutant, Intermédiaire, Avancé). Le bloc « Vignette » accepte une image de couverture : « PNG ou JPG · 16:9 recommandé · max 5 Mo ». Le panneau « Paramètres » regroupe « Public cible », « Cours obligatoire » et « Délivrer un certificat ».

Choisir le public cible d'un cours — « Public cible » détermine à qui la formation est attribuée automatiquement. « Catalogue (auto-inscription) » n'attribue rien, les apprenants s'y inscrivent eux-mêmes. « Générale (tous les employés) » l'affecte à tous les comptes actifs à la publication. « Département spécifique » demande un « Département cible » : elle va à ses membres et reste masquée aux autres.

Étape « Programme » — cliquez sur « Ajouter un chapitre », donnez un « Titre du chapitre », puis ajoutez des leçons avec les boutons de format « Vidéo », « PDF », « Audio », « Présentation » et « Texte ». Chaque leçon reçoit un « Titre de la leçon » et une durée en « min » ; le trombone « Joindre un fichier » y attache le média.

Attention aux fichiers joints pendant la création — l'assistant enregistre votre saisie en local (« Enregistré à l'instant ») et la restaure, mais les fichiers joints ne tiennent qu'en mémoire : si vous quittez la page ou la rechargez avant de publier, il faudra les joindre à nouveau, comme l'annonce « Enregistré — les fichiers joints restent en mémoire uniquement ».

Étape « Quiz » — cliquez sur « Ajouter une question », choisissez « Choix unique », « Choix multiple », « Vrai / Faux » ou « Liste déroulante », saisissez l'intitulé puis les réponses avec « Ajouter une option » ; le bouton à gauche sert à « Marquer comme correcte ». Il faut deux réponses au minimum. Le panneau « Paramètres du quiz » fixe le « Score de réussite ».

Étape « Révision » et publication — « Vérifier et publier » récapitule le cours et coche, dans « Prêt à publier », le titre et la description, les leçons, les questions de quiz, les fichiers joints et « Certificat à la réussite ». Terminez par « Publier le cours » ou « Enregistrer comme brouillon » ; vous arrivez ensuite dans l'éditeur du cours créé.

Modifier un cours existant dans l'éditeur — le titre du cours ou « Modifier le contenu » ouvre /admin/courses/<slug>/edit. L'en-tête porte le badge « Publié » ou « Brouillon », le bouton « Assigner à… » et « Aperçu de la formation ». Le premier bloc reprend titre, description, catégorie, niveau, durée, public cible et objectifs ; validez par « Enregistrer les modifications ».

Gérer les chapitres et les leçons — dans l'éditeur, la section « Chapitres » propose « Ajouter un chapitre » et, sur chacun, le crayon et la corbeille. « Ajouter une leçon » ouvre un formulaire : « Titre de la leçon », « Type de contenu », puis « Contenu texte », ou « URL externe » et « Téléverser un fichier ». La case « Aperçu gratuit (visible avant l'inscription) » la rend visible sans inscription.

Ajouter des ressources téléchargeables — dans l'éditeur, la section « Ressources » et le bouton « Ajouter une ressource » ouvrent une fenêtre avec « Titre de la ressource », « URL externe » et « Téléverser un fichier » : fournissez une URL ou un fichier. Les ressources apparaissent ensuite sur la fiche du cours pour les apprenants, et la corbeille les retire.

Construire une évaluation depuis l'éditeur — la section « Quiz » puis « Ajouter un quiz » ouvre le formulaire complet : « Titre du quiz », « Score de réussite (%) » et « Portée », qui vaut « Niveau cours » ou « Niveau chapitre » (choisissez alors le « Chapitre »). Cochez « Publié » pour que le quiz compte. Les apprenants le repassent sans limite de tentatives.

Comment un quiz conditionne la fin de cours et le certificat — la progression additionne les leçons terminées et les quiz publiés réussis ; le cours n'est « Terminé » que lorsque tout est fait et réussi. Si « Délivrer un certificat » est activé, le certificat est alors délivré automatiquement. Un quiz laissé en brouillon ne bloque rien et ne compte pas.

Affecter un cours à un collaborateur — deux chemins ouvrent la fenêtre « Affecter un cours » : le bouton « Assigner à… » dans l'éditeur d'un cours, où le cours est déjà choisi, ou « Rapports » puis l'onglet « Affectations » et « Affecter un cours ». Renseignez « Apprenant », une « Échéance » facultative et une « Note », puis validez par « Affecter ».

À qui un manager peut affecter un cours — la liste « Choisir un apprenant » ne propose que les comptes actifs de votre département ou, sans département, les personnes dont vous êtes le manager ; jamais un administrateur. L'affectation inscrit l'apprenant, qui la voit dans « Formations assignées ». La corbeille de l'onglet « Affectations » la retire.

Suivre son équipe — sur /dashboard, le bloc « Suivi de mon équipe » compte les formations affectées et les répartit en « Non démarrées », « En cours », « Terminées » et « En retard ». Chaque carte donne l'apprenant, le cours, sa progression et un badge « À rendre le … » ou « En retard depuis le … ». « Gérer les affectations » ouvre /admin/reports.

Consulter et exporter les rapports d'équipe — ouvrez « Gérer » puis « Rapports » (/admin/reports), onglet « Rapports ». Filtrez par « Département », « Cours » et « Statut ». Le tableau donne « Apprenant », « Département », « Cours », « Statut », « Progression » et « Terminé le ». Un manager ne voit que son département ou les personnes qu'il encadre ; CSV, XLSX et PDF exportent les lignes filtrées.

Modérer les commentaires d'un cours — dans la discussion attachée à un cours ou à une leçon, un manager dispose de « Masquer », « Afficher » et « Supprimer » sur n'importe quel commentaire. Un commentaire masqué vous reste visible avec l'étiquette « Masqué » mais disparaît pour les apprenants.

Modérer les salons de discussion — sur la page « Communauté », un manager peut supprimer n'importe quel message : survolez-le et cliquez sur l'icône corbeille « Supprimer le message ». La suppression est immédiate pour tous les participants connectés, alors qu'un apprenant ne retire que ses propres messages.

Base de connaissances FAQ de l'assistant — la page « FAQ & assistant » (/admin/faq), qui alimente l'assistant, est réservée aux administrateurs : elle n'apparaît pas dans le menu « Gérer » d'un manager et l'ouvrir directement affiche « Accès refusé ». Demandez à un administrateur d'ajouter une question ; vos cours publiés nourrissent déjà l'assistant.
