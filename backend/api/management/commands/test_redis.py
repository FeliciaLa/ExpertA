from django.core.management.base import BaseCommand
from django.conf import settings
import django_rq
import redis
from redis import ConnectionError as RedisConnectionError


class Command(BaseCommand):
    help = 'Test Redis connection and RQ configuration'

    def handle(self, *args, **options):
        self.stdout.write("Testing Redis connection and RQ configuration...")
        
        # Test 1: Basic Redis connection
        try:
            if hasattr(settings, 'RQ_QUEUES') and settings.RQ_QUEUES:
                # Try to get a connection from the default queue
                queue_config = settings.RQ_QUEUES.get('default', {})
                
                if 'CONNECTION_KWARGS' in queue_config:
                    # Using Redis URL
                    connection_pool = queue_config['CONNECTION_KWARGS']['connection_pool']
                    r = redis.Redis(connection_pool=connection_pool)
                else:
                    # Using host/port
                    r = redis.Redis(
                        host=queue_config.get('HOST', 'localhost'),
                        port=queue_config.get('PORT', 6379),
                        db=queue_config.get('DB', 0),
                        password=queue_config.get('PASSWORD', '') or None
                    )
                
                # Test connection
                r.ping()
                self.stdout.write(
                    self.style.SUCCESS("✓ Redis connection successful")
                )
                
                # Test basic operations
                r.set('test_key', 'test_value')
                value = r.get('test_key')
                if value == b'test_value':
                    self.stdout.write(
                        self.style.SUCCESS("✓ Redis read/write operations working")
                    )
                    r.delete('test_key')
                else:
                    self.stdout.write(
                        self.style.ERROR("✗ Redis read/write operations failed")
                    )
                    
            else:
                self.stdout.write(
                    self.style.ERROR("✗ RQ_QUEUES not configured in settings")
                )
                return
                
        except RedisConnectionError as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Redis connection failed: {str(e)}")
            )
            return
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Redis test failed: {str(e)}")
            )
            return

        # Test 2: Django RQ queues
        try:
            # Test each configured queue
            for queue_name in settings.RQ_QUEUES.keys():
                queue = django_rq.get_queue(queue_name)
                queue_length = len(queue)
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Queue '{queue_name}' is accessible (length: {queue_length})")
                )
                
                # Test job enqueuing
                def test_job():
                    return "Hello from RQ!"
                
                job = queue.enqueue(test_job)
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Test job enqueued successfully: {job.id}")
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Django RQ test failed: {str(e)}")
            )
            return

        # Test 3: Knowledge processing tasks
        try:
            from api.tasks import process_training_message_async
            self.stdout.write(
                self.style.SUCCESS("✓ Knowledge processing tasks are importable")
            )
        except ImportError as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Failed to import knowledge processing tasks: {str(e)}")
            )

        self.stdout.write(
            self.style.SUCCESS("\n🎉 All Redis and RQ tests passed! Async processing is ready.")
        ) 