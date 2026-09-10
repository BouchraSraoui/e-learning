
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='question',
            name='type',
            field=models.CharField(choices=[('single', 'Single choice'), ('multiple', 'Multiple choice'), ('true_false', 'True / false'), ('dropdown', 'Dropdown')], default='single', max_length=16),
        ),
    ]
