from kafka.admin import KafkaAdminClient, NewTopic
import os

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

def create_topics():
    print(f"Connecting to Kafka at {KAFKA_BOOTSTRAP_SERVERS}...")
    try:
        admin_client = KafkaAdminClient(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            client_id='supplysense_admin'
        )
        
        topic_names = [
            "inventory.changes",
            "forecast.updates",
            "procurement.events",
            "supplier.alerts",
            "weather.alerts",
            "market.signals",
            "agent.decisions",
            "user.actions"
        ]
        
        existing_topics = admin_client.list_topics()
        
        new_topics = []
        for name in topic_names:
            if name not in existing_topics:
                new_topics.append(NewTopic(name=name, num_partitions=1, replication_factor=1))
        
        if new_topics:
            admin_client.create_topics(new_topics=new_topics, validate_only=False)
            print(f"Created topics: {[t.name for t in new_topics]}")
        else:
            print("All topics already exist.")
            
    except Exception as e:
        print(f"Failed to create topics: {e}. (This is expected in smoke test if Kafka isn't running)")

if __name__ == "__main__":
    create_topics()
