"""
Django management command to run background tasks for knowledge processing
"""
from django.core.management.base import BaseCommand
from background_task.management.commands.process_tasks import Command as ProcessTasksCommand
import time

class Command(BaseCommand):
    help = 'Run background tasks for knowledge processing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--duration',
            type=int,
            default=0,
            help='Run for specified number of seconds (0 = run indefinitely)',
        )
        parser.add_argument(
            '--sleep',
            type=int,
            default=5,
            help='Sleep time between task checks in seconds',
        )

    def handle(self, *args, **options):
        duration = options['duration']
        sleep_time = options['sleep']
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Starting background task processor...'
                f' (duration: {"indefinite" if duration == 0 else f"{duration}s"}, '
                f'sleep: {sleep_time}s)'
            )
        )
        
        # Create an instance of the background task processor
        processor = ProcessTasksCommand()
        
        start_time = time.time()
        
        try:
            while True:
                # Run one iteration of task processing
                processor.handle(sleep=sleep_time, duration=0)
                
                # Check if we should stop based on duration
                if duration > 0 and (time.time() - start_time) >= duration:
                    self.stdout.write(
                        self.style.SUCCESS(f'Stopping after {duration} seconds')
                    )
                    break
                    
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.SUCCESS('Background task processor stopped by user')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Background task processor error: {e}')
            )
            raise 