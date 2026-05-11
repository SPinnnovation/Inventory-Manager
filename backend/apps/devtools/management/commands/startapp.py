import os
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand

BOILERPLATE = {
    "__init__.py": "# This file marks the package\n",
    "apps.py": "from django.apps import AppConfig\n\n\nclass {class_name}Config(AppConfig):\n    default_auto_field = 'django.db.models.BigAutoField'\n    name = 'apps.{app_name}'\n",
    "admin.py": "from django.contrib import admin\n\n# Register your models here.\n",
    "tasks.py": "from celery import shared_task\n\n# Create your tasks here.\n",
    "services.py": "# Create your services here.\n",
    "signals.py": "# Create your signals here.\n",
    "models.py": "from django.db import models\n\n# Create your models here.\n",
    "views.py": "from django.shortcuts import render\nfrom django.http import HttpResponse\n\n# Create your views here.\n\ndef index(request):\n    return HttpResponse('OK')\n",
    "tests.py": "from django.test import TestCase\n\n# Create your tests here.\n",
    "serializers.py": "from rest_framework import serializers\n\n# Create your serializers here.\n",
    "urls.py": "from django.urls import path\nfrom . import views\n\napp_name = '{app_name}'\n\nurlpatterns = [\n    # path('', views.index, name='index'),\n]\n",
    "migrations/__init__.py": "# migrations package\n",
}

def create_file(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(content, encoding="utf-8")

class Command(BaseCommand):
    help = "Create a new app under backend/apps/<name>, create common files, and add to LOCAL_APPS."

    def add_arguments(self, parser):
        parser.add_argument('name', nargs=1, help='App name (single)')

    def handle(self, *args, **options):
        app_name = options["name"][0].strip()
        if not app_name:
            self.stderr.write("You must provide an app name. Usage: python manage.py startapp <app_name>")
            return

        apps_root: Path = Path(settings.BASE_DIR) / "apps"
        apps_root.mkdir(parents=True, exist_ok=True)
        (apps_root / "__init__.py").touch(exist_ok=True)

        target = apps_root / app_name
        if target.exists():
            self.stderr.write(f"App directory already exists: {target}")
            return

        # Create files from BOILERPLATE
        for rel_path, tpl in BOILERPLATE.items():
            dest = target / rel_path
            content = tpl.format(app_name=app_name, class_name=app_name.capitalize())
            create_file(dest, content)
            self.stdout.write(self.style.SUCCESS(f"Created {dest.relative_to(settings.BASE_DIR)}"))

        # Add to LOCAL_APPS in settings.py
        settings_path = Path(settings.BASE_DIR) / "core" / "settings.py"
        entry = f"    'apps.{app_name}',\n"
        try:
            content = settings_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f"Could not open settings.py at {settings_path}. Please add 'apps.{app_name}' to LOCAL_APPS manually."))
            return

        if f"apps.{app_name}" in content:
            self.stdout.write(self.style.WARNING(f"'apps.{app_name}' already present in settings.py"))
            return

        lines = content.splitlines(keepends=True)
        new_lines = []
        inserted = False
        in_local = False

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not in_local and stripped.startswith("LOCAL_APPS") and "[" in stripped:
                in_local = True
                new_lines.append(line)
                continue

            if in_local:
                if stripped.startswith("]"):
                    new_lines.append(entry)
                    new_lines.append(line)
                    inserted = True
                    in_local = False
                    continue

            new_lines.append(line)

        if not inserted:
            joined = "".join(lines)
            if "LOCAL_APPS = []" in joined:
                joined = joined.replace("LOCAL_APPS = []", "LOCAL_APPS = [\n" + entry + "]")
                settings_path.write_text(joined, encoding="utf-8")
                self.stdout.write(self.style.SUCCESS(f"Inserted 'apps.{app_name}' into LOCAL_APPS in settings.py"))
            else:
                self.stderr.write(self.style.ERROR("Could not locate LOCAL_APPS list in settings.py. Please add the app manually: " + f"'apps.{app_name}',"))
                # still return success for app creation
                self.stdout.write(self.style.SUCCESS(f"App created at {target} (manual settings update required)"))
                return
        else:
            settings_path.write_text("".join(new_lines), encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Added 'apps.{app_name}' to LOCAL_APPS in settings.py"))

        self.stdout.write(self.style.SUCCESS(f"App created at {target}"))