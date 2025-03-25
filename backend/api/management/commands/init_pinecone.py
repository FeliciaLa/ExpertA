from django.core.management.base import BaseCommand
from api.pinecone_utils import init_pinecone

class Command(BaseCommand):
    help = 'Initialize Pinecone index'

    def handle(self, *args, **options):
        self.stdout.write('Initializing Pinecone...')
        index = init_pinecone()
        if index:
            self.stdout.write(self.style.SUCCESS('Successfully initialized Pinecone index'))
        else:
            self.stdout.write(self.style.ERROR('Failed to initialize Pinecone index')) 