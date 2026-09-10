
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assistant', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='faqentry',
            name='language',
            field=models.CharField(choices=[('fr', 'Français'), ('en', 'English')], default='fr', max_length=2),
        ),
    ]
