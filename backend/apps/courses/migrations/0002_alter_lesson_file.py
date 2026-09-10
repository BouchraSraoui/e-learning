
import apps.courses.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lesson',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='lesson_files/', validators=[apps.courses.validators.FileValidator(frozenset(['.aac', '.key', '.m4a', '.m4v', '.mov', '.mp3', '.mp4', '.odp', '.oga', '.ogg', '.ogv', '.pdf', '.ppt', '.pptx', '.wav', '.webm']), max_mb=500)]),
        ),
    ]
