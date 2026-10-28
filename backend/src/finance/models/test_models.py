from sqlalchemy import create_engine
# 1. IMPORT ALL YOUR MODELS HERE so SQLAlchemy registers them to metadata
from my_project.models.base import Base 
from my_project.models.customer import Customer
from my_project.models.ticket import TicketOrder

def test_models():
    # 2. Create an in-memory database engine
    engine = create_engine("sqlite:///:memory:")
    
    try:
        # 3. Force SQLAlchemy to issue CREATE TABLE commands
        Base.metadata.create_all(engine)
        print("✅ Success! All models and foreign keys compiled cleanly.")
    except Exception as e:
        print(f"❌ Schema compilation failed: {e}")

if __name__ == "__main__":
    test_models()
