
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='FaqEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question', models.CharField(max_length=300)),
                ('answer', models.TextField()),
                ('category', models.CharField(blank=True, max_length=80)),
                ('keywords', models.JSONField(blank=True, default=list)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_published', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'FAQ entry',
                'verbose_name_plural': 'FAQ entries',
                'ordering': ['order', 'id'],
            },
        ),
    ]
