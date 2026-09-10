from django.core.management.base import BaseCommand

from apps.assistant.models import FaqEntry

FAQS = [
    {
        'question': 'Comment réinitialiser mon mot de passe ?',
        'answer': (
            'Sur la page de connexion, cliquez sur « Mot de passe oublié », saisissez votre '
            'e-mail professionnel puis suivez le lien reçu par e-mail pour définir un nouveau '
            'mot de passe. Une fois connecté, vous pouvez aussi le changer depuis Paramètres.'
        ),
        'category': 'Compte',
        'keywords': ['mot de passe', 'password', 'connexion', 'oublié', 'reinitialiser', 'reset', 'login'],
        'language': 'fr',
        'order': 1,
    },
    {
        'question': 'Comment m’inscrire à un cours ?',
        'answer': (
            'Ouvrez le Catalogue, sélectionnez le cours qui vous intéresse, puis cliquez sur '
            '« S’inscrire ». Le cours apparaît immédiatement dans « Mes formations », où vous '
            'pouvez commencer à apprendre.'
        ),
        'category': 'Cours',
        'keywords': ['inscrire', 'inscription', 'enroll', 's’inscrire', 'catalogue', 'cours', 'suivre'],
        'language': 'fr',
        'order': 2,
    },
    {
        'question': 'Ma progression est-elle enregistrée si je quitte un cours ?',
        'answer': (
            'Oui. Votre progression et votre position de lecture sont enregistrées '
            'automatiquement. À votre retour, reprenez exactement là où vous vous étiez arrêté '
            'depuis « Mes formations » ou votre tableau de bord.'
        ),
        'category': 'Progression',
        'keywords': ['progression', 'reprendre', 'resume', 'sauvegarde', 'enregistrée', 'position', 'quitter'],
        'language': 'fr',
        'order': 3,
    },
    {
        'question': 'Comment obtenir un certificat ?',
        'answer': (
            'Un certificat est délivré automatiquement lorsque vous terminez toutes les leçons '
            'd’un cours et réussissez son quiz. Retrouvez-le ensuite dans la page « Certificats », '
            'd’où vous pouvez le télécharger en PDF.'
        ),
        'category': 'Certificats',
        'keywords': ['certificat', 'certificate', 'obtenir', 'diplome', 'attestation', 'reussir', 'terminer'],
        'language': 'fr',
        'order': 4,
    },
    {
        'question': 'Comment télécharger ou vérifier un certificat ?',
        'answer': (
            'Depuis la page « Certificats », cliquez sur « Télécharger » pour obtenir le PDF. '
            'Chaque certificat porte un code de vérification unique : toute personne peut '
            'confirmer son authenticité via la page publique /verify.'
        ),
        'category': 'Certificats',
        'keywords': ['télécharger', 'download', 'vérifier', 'verify', 'certificat', 'pdf', 'code', 'authenticité'],
        'language': 'fr',
        'order': 5,
    },
    {
        'question': 'Puis-je repasser un quiz que j’ai échoué ?',
        'answer': (
            'Oui, si le formateur a autorisé les tentatives multiples. Après un échec, un bouton '
            '« Réessayer » apparaît dans le lecteur de quiz. Le nombre de tentatives restantes y '
            'est indiqué ; votre meilleur score est conservé.'
        ),
        'category': 'Évaluations',
        'keywords': ['quiz', 'repasser', 'réessayer', 'retake', 'tentative', 'échoué', 'score', 'evaluation'],
        'language': 'fr',
        'order': 6,
    },
    {
        'question': 'Que sont les cours obligatoires ?',
        'answer': (
            'Les cours obligatoires sont des formations que votre organisation attend de vous. '
            'Ils sont mis en avant sur votre tableau de bord dans « Requis pour vous » jusqu’à ce '
            'que vous les terminiez.'
        ),
        'category': 'Cours',
        'keywords': ['obligatoire', 'obligatoires', 'mandatory', 'requis', 'assigné',
                     'imposé', 'tableau de bord'],
        'language': 'fr',
        'order': 7,
    },
    {
        'question': 'Comment gagner des badges et des points ?',
        'answer': (
            'Vous gagnez des badges et des points en franchissant des étapes : première '
            'inscription, cours terminés, quiz réussis, régularité. Consultez vos badges dans '
            '« Badges » et votre position dans « Classement ».'
        ),
        'category': 'Engagement',
        'keywords': ['badge', 'badges', 'points', 'gagner', 'classement', 'leaderboard', 'recompense', 'streak'],
        'language': 'fr',
        'order': 8,
    },
    {
        'question': 'Comment discuter avec les autres apprenants ?',
        'answer': (
            'Rendez-vous dans « Communauté » pour échanger en temps réel dans les salons de '
            'discussion. Vous pouvez aussi commenter et réagir directement sur la page d’un cours.'
        ),
        'category': 'Communauté',
        'keywords': ['communauté', 'chat', 'discussion', 'salon', 'commentaire', 'échanger', 'apprenants', 'messages'],
        'language': 'fr',
        'order': 9,
    },
    {
        'question': 'Comment changer la langue de l’interface ?',
        'answer': (
            'Ouvrez Paramètres (ou votre profil) et choisissez votre langue : français ou anglais. '
            'L’interface s’adapte immédiatement.'
        ),
        'category': 'Compte',
        'keywords': ['langue', 'language', 'français', 'anglais', 'interface', 'traduction'],
        'language': 'fr',
        'order': 10,
    },
    {
        'question': 'Comment modifier mon profil ou ma photo ?',
        'answer': (
            'Depuis « Mon profil », cliquez sur « Modifier le profil », puis dans « Paramètres » '
            'mettez à jour votre « Prénom » et votre « Nom » (ou vos autres informations) et '
            'enregistrez. Cliquez sur votre avatar pour changer de photo. L’e-mail de connexion '
            'ne se modifie pas ici : contactez un administrateur.'
        ),
        'category': 'Compte',
        'keywords': ['profil', 'photo', 'avatar', 'modifier', 'informations', 'profile',
                     'téléverser', 'nom', 'prénom', 'renommer', 'coordonnées', 'name',
                     'email', 'e-mail', 'mail', 'courriel', 'poste', 'téléphone',
                     'notification', 'notifications', 'préférences'],
        'language': 'fr',
        'order': 11,
    },
    {
        'question': 'How do I reset my password?',
        'answer': (
            'On the login page, click “Forgot password”, enter your work email, then follow '
            'the link you receive by email to set a new password. Once signed in, you can '
            'also change it from Settings.'
        ),
        'category': 'Account',
        'keywords': ['password', 'reset', 'forgot', 'login', 'sign in', 'mot de passe'],
        'language': 'en',
        'order': 1,
    },
    {
        'question': 'How do I enrol in a course?',
        'answer': (
            'Open the Catalog, select the course you are interested in, then click “Enroll”. '
            'The course immediately appears in “My learning”, where you can start learning.'
        ),
        'category': 'Courses',
        'keywords': ['enroll', 'enrol', 'enrolment', 'register', 'catalog', 'course', 'subscribe'],
        'language': 'en',
        'order': 2,
    },
    {
        'question': 'Is my progress saved if I leave a course?',
        'answer': (
            'Yes. Your progress and playback position are saved automatically. When you come '
            'back, resume exactly where you left off from “My learning” or your dashboard.'
        ),
        'category': 'Progress',
        'keywords': ['progress', 'resume', 'saved', 'position', 'leave', 'continue'],
        'language': 'en',
        'order': 3,
    },
    {
        'question': 'How do I earn a certificate?',
        'answer': (
            'A certificate is issued automatically when you complete all the lessons of a '
            'course and pass its quiz. You will then find it on the “Certificates” page, '
            'where you can download it as a PDF.'
        ),
        'category': 'Certificates',
        'keywords': ['certificate', 'earn', 'diploma', 'pass', 'complete', 'finish', 'certificat'],
        'language': 'en',
        'order': 4,
    },
    {
        'question': 'How do I download or verify a certificate?',
        'answer': (
            'From the “Certificates” page, click “Download” to get the PDF. Every certificate '
            'carries a unique verification code: anyone can confirm its authenticity via the '
            'public /verify page.'
        ),
        'category': 'Certificates',
        'keywords': ['download', 'verify', 'certificate', 'pdf', 'code', 'authenticity'],
        'language': 'en',
        'order': 5,
    },
    {
        'question': 'Can I retake a quiz I failed?',
        'answer': (
            'Yes, if the trainer allowed multiple attempts. After a fail, a “Retry” button '
            'appears in the quiz player. The number of remaining attempts is shown there; '
            'your best score is kept.'
        ),
        'category': 'Assessments',
        'keywords': ['quiz', 'retake', 'retry', 'attempt', 'failed', 'score', 'assessment'],
        'language': 'en',
        'order': 6,
    },
    {
        'question': 'What are mandatory courses?',
        'answer': (
            'Mandatory courses are trainings your organisation expects you to complete. They '
            'are highlighted on your dashboard under “Required for you” until you finish them.'
        ),
        'category': 'Courses',
        'keywords': ['mandatory', 'required', 'assigned', 'compulsory', 'dashboard'],
        'language': 'en',
        'order': 7,
    },
    {
        'question': 'How do I earn badges and points?',
        'answer': (
            'You earn badges and points by reaching milestones: first enrolment, completed '
            'courses, passed quizzes, regular activity. Check your badges under “Badges” and '
            'your position under “Leaderboard”.'
        ),
        'category': 'Engagement',
        'keywords': ['badge', 'badges', 'points', 'earn', 'leaderboard', 'ranking', 'reward', 'streak'],
        'language': 'en',
        'order': 8,
    },
    {
        'question': 'How do I chat with other learners?',
        'answer': (
            'Go to “Community” to chat in real time in the discussion rooms. You can also '
            'comment and react directly on a course page.'
        ),
        'category': 'Community',
        'keywords': ['community', 'chat', 'discussion', 'room', 'comment', 'learners', 'messages'],
        'language': 'en',
        'order': 9,
    },
    {
        'question': 'How do I change the interface language?',
        'answer': (
            'Open Settings (or your profile) and choose your language: French or English. '
            'The interface adapts immediately.'
        ),
        'category': 'Account',
        'keywords': ['language', 'french', 'english', 'interface', 'translation', 'langue'],
        'language': 'en',
        'order': 10,
    },
    {
        'question': 'How do I edit my profile or photo?',
        'answer': (
            'From “My profile”, click “Edit profile”, then under “Settings” update your '
            '“First name” and “Last name” (or your other details) and save. Click your avatar '
            'to change your photo. Your sign-in email can’t be changed here — contact an '
            'administrator.'
        ),
        'category': 'Account',
        'keywords': ['profile', 'photo', 'avatar', 'edit', 'information', 'upload',
                     'name', 'rename', 'first name', 'last name', 'display name',
                     'email', 'mail', 'phone', 'job', 'title', 'picture', 'details',
                     'notification', 'notifications', 'preferences'],
        'language': 'en',
        'order': 11,
    },
]


class Command(BaseCommand):
    help = 'Seed the bilingual (FR/EN) FAQ knowledge base (idempotent, upsert by question).'

    def handle(self, *args, **options):
        created = updated = 0
        for spec in FAQS:
            _, was_created = FaqEntry.objects.update_or_create(
                question=spec['question'],
                defaults={
                    'answer': spec['answer'],
                    'category': spec['category'],
                    'keywords': spec['keywords'],
                    'language': spec['language'],
                    'order': spec['order'],
                    'is_published': True,
                },
            )
            created += was_created
            updated += not was_created
        self.stdout.write(
            self.style.SUCCESS(f'FAQ seed complete — {created} created, {updated} updated.')
        )
