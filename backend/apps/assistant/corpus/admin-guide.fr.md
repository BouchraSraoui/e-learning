# Guide de l'administrateur
URL: /admin/users
Audience: admin

Accéder aux pages d'administration — tout passe par le menu « Gérer » de la barre de navigation. Un administrateur y trouve « Utilisateurs » (/admin/users), « Cours » (/admin/courses), « Statistiques » (/admin/analytics), « Rapports » (/admin/reports) et « FAQ » (/admin/faq). Utilisateurs, Statistiques et FAQ sont réservées aux administrateurs : un manager qui tente l'URL obtient « Accès refusé ».

Rechercher et filtrer les utilisateurs — ouvrez « Utilisateurs » depuis le menu « Gérer ». Le champ « Rechercher par nom ou e-mail… » filtre la liste au fil de la frappe, et trois listes affinent le résultat : le rôle (« Tous les rôles »), le département (« Tous les départements ») et le statut (« Tous les statuts », « Actif », « Inactif »). Le tableau affiche Nom, Rôle, Département, Statut et Actions, vingt par page.

Créer un utilisateur — sur « Utilisateurs », cliquez sur « Nouvel utilisateur ». Renseignez l'e-mail professionnel, le « Prénom », le « Nom », le « Rôle », le « Département », la « Fonction » et la « Langue », puis validez avec « Créer l'utilisateur ». Le mot de passe est facultatif : le champ affiche l'indication « Laissez vide pour envoyer un lien de réinitialisation. », mais laisser le champ vide crée seulement un compte sans mot de passe utilisable — aucun e-mail n'est envoyé, et la personne doit demander elle-même un lien via « Oublié ? » sur la page de connexion. S'il est fourni, il doit faire 8 caractères au moins. Un e-mail déjà pris est refusé.

Modifier un utilisateur — sur la ligne du compte, cliquez sur l'icône crayon pour ouvrir « Modifier l'utilisateur ». Vous y changez le prénom, le nom, le rôle, le département, la fonction, la langue et la case « Compte actif ». L'adresse e-mail n'est pas modifiable depuis ce formulaire ; elle est seulement rappelée en sous-titre. Laissez « Mot de passe » vide pour conserver le mot de passe actuel.

Désactiver plutôt que supprimer un compte — l'icône du milieu bascule entre « Désactiver » et « Activer » ; un compte désactivé ne peut plus se connecter et sa session en cours cesse d'être renouvelée. La corbeille ouvre « Supprimer l'utilisateur » : « Cette action est irréversible. Envisagez plutôt de désactiver le compte. » La suppression efface aussi inscriptions, progression, affectations et certificats.

Changer le rôle d'un utilisateur — le champ « Rôle » propose trois valeurs. « Utilisateur » donne accès au seul parcours d'apprentissage : catalogue, cours, quiz, certificats, badges. « Manager » peut en plus créer des cours, modifier et supprimer ceux dont il est l'auteur et consulter les rapports. « Administrateur » accède à tout : catalogue complet, comptes, statistiques, audit et FAQ.

Rattacher un utilisateur à un département et à un manager — le département se règle avec la liste « Département » du formulaire (« Aucun département » laisse le compte non rattaché) ; il sert de filtre partout et conditionne les cours réservés à un département. Déplacer une personne vers un autre département lui affecte les cours publiés de celui-ci. Le manager se renseigne uniquement par l'import, colonne « manager ».

Exporter la liste des utilisateurs — sur la page « Utilisateurs », les boutons « CSV » et « XLSX » téléchargent la liste telle qu'elle est filtrée à l'écran : recherche, rôle, département et statut s'appliquent à l'export. Le fichier contient les colonnes email, first_name, last_name, role, department, team, manager, job_title, phone, location, language et is_active.

Importer des utilisateurs en masse — cliquez sur « Importer ». « Télécharger le modèle » récupère un fichier d'exemple aux bonnes colonnes, « Choisir un fichier » accepte « CSV ou XLSX, jusqu'à 5 Mo » et 5 000 lignes au maximum, « Lancer l'import » exécute le traitement. L'e-mail sert de clé : un e-mail inconnu crée le compte, un e-mail déjà présent met à jour les seuls champs renseignés dans le fichier.

Corriger un import d'utilisateurs — après le traitement, la fenêtre affiche « {n} créé(s) », « {n} mis à jour » et, s'il y a lieu, « {n} erreur(s) ». Chaque ligne fautive apparaît sous la forme « Ligne {n} : », avec l'e-mail et le motif : e-mail manquant ou invalide, rôle inconnu, langue inconnue, département ou équipe introuvable, mot de passe trop faible. Les lignes valides, elles, sont bien enregistrées.

Gérer tout le catalogue — la page « Cours » liste, pour un administrateur, la totalité des cours de la plateforme, brouillons compris et quel qu'en soit l'auteur ; un manager n'y voit que les siens. Filtrez avec « Rechercher un cours… », « Tous les niveaux » et « Tous les statuts » (« Publié », « Brouillon »). Le premier bouton d'une ligne bascule « Publier » ou « Dépublier », l'icône œil ouvre « Aperçu de la formation ».

Créer un cours avec l'assistant en quatre étapes — depuis « Cours », cliquez sur « Nouveau cours ». Il enchaîne « Détails » (titre, description, catégorie, niveau, langue, vignette), « Programme » (chapitres et leçons), « Quiz » et « Révision ». Le panneau « Paramètres » regroupe « Public cible », « Cours obligatoire », « Délivrer un certificat » et « Déblocage séquentiel ». Terminez par « Enregistrer comme brouillon » ou « Publier le cours ».

Choisir le public cible d'un cours — la liste « Public cible » propose « Catalogue (auto-inscription) », « Générale (tous les employés) », et « Département spécifique », qui exige un « Département cible » et masque le cours aux autres employés. Publier un cours général ou de département crée pour chaque personne visée une affectation et son inscription : il apparaît aussitôt dans « Mes formations ».

Modifier ou supprimer un cours existant — ouvrez « Cours », puis le titre du cours ou l'icône « Modifier le contenu ». La page réunit « Détails du cours », le panneau « Publication » avec « Enregistrer les modifications » et « Publier »/« Dépublier », puis « Chapitres », « Ressources » et « Quiz ». Un administrateur peut éditer n'importe quel cours. La suppression avertit que les chapitres, leçons et quiz partiront aussi.

Affecter un cours à un collaborateur — ouvrez « Rapports », onglet « Affectations », puis « Affecter un cours ». Choisissez l'« Apprenant », le « Cours », une « Échéance » facultative et une « Note », puis validez par « Affecter » : la personne est inscrite automatiquement. Le même formulaire s'ouvre depuis « Assigner à… » sur la page d'édition d'un cours. Un administrateur peut affecter un cours à n'importe quel compte actif.

Suivre et retirer les affectations — l'onglet « Affectations » liste chaque affectation avec l'apprenant, le cours, l'« Échéance » et l'avancement (« Non commencé », « En cours », « Terminé »). L'icône corbeille « Retirer l'affectation » la supprime, confirmée par « Affectation supprimée ». Retirer une affectation ne supprime pas la progression déjà enregistrée par l'apprenant.

Consulter les statistiques de la plateforme — la page « Statistiques » est réservée aux administrateurs. Elle affiche « Utilisateurs », « Cours publiés », « Inscriptions », « Taux de réussite » (part des inscriptions terminées), « Certificats délivrés » et « Score moyen aux quiz », puis « Utilisateurs par rôle », l'« Entonnoir des inscriptions », les « Cours les plus suivis » et le bloc « Par catégorie ».

Produire et exporter un rapport de progression — ouvrez « Rapports », onglet « Rapports ». Filtrez par « Département », « Cours » et « Statut » ; le tableau donne l'apprenant et son e-mail, le département, le cours, le statut, la progression et la date de fin. Les boutons « CSV », « XLSX » et « PDF » téléchargent les lignes affichées. Un administrateur voit tous les collaborateurs, un manager son seul périmètre.

Consulter le journal d'audit — l'onglet « Journal d'audit » de la page « Rapports » n'apparaît que pour les administrateurs. Il liste les colonnes « Action », « Auteur », « Cible » et « Date ». Y sont tracées la création, la modification et la suppression d'un utilisateur, les imports d'utilisateurs, les affectations créées ou retirées, et les exports de rapports.

Gérer la base de connaissances de l'assistant — la page « FAQ » alimente le chatbot. « Nouvelle question » ouvre le formulaire : « Question », « Réponse », « Catégorie », « Langue », « Ordre » et « Mots-clés » ; la case « Publié (visible par l'assistant et les apprenants) » décide de la mise en ligne. Le tableau se filtre avec « Rechercher une question… » et « Toutes les langues ».

Modérer les commentaires d'un cours — les commentaires sont en bas de la fiche du cours, dans le bloc « Discussion ». Chaque commentaire propose à un administrateur « Masquer » et « Supprimer ». Un commentaire masqué disparaît pour les apprenants mais reste visible des administrateurs et des managers avec la mention « Masqué », et « Afficher » le rétablit. La suppression, elle, est définitive.

Modérer les salons de discussion et exclure un participant — sur la page « Communauté », survolez un message : l'icône corbeille « Supprimer le message » apparaît, pour les administrateurs et les managers, sur n'importe quel message. Le bannissement, lui, se fait salon par salon et n'a pas encore de bouton dans cette page : le membre banni reçoit « Vous n'êtes pas autorisé à publier dans ce salon. »
