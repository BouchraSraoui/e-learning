from django.db import migrations, models


ROLE_FORWARD = {'learner': 'user', 'trainer': 'manager'}
ROLE_BACKWARD = {'user': 'learner'}


def _remap(mapping):
    def run(apps, schema_editor):
        User = apps.get_model('accounts', 'User')
        for old, new in mapping.items():
            User.objects.filter(role=old).update(role=new)

    return run


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_auditlog'),
    ]

    operations = [
        migrations.RunPython(_remap(ROLE_FORWARD), _remap(ROLE_BACKWARD)),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('user', 'User'), ('manager', 'Manager'), ('admin', 'Administrator')],
                default='user',
                max_length=16,
            ),
        ),
    ]
