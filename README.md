# Peer-to-Peer Payment Splitter

A TypeScript backend using modular monolith architecture with clear separation of concerns, to make it simple if we need to extract to microservices in the future. Designed with centralized dependency injection for testability, repository pattern for data abstraction, and event-driven processing via AWS SQS for asynchronous operations. The application uses Prisma ORM with PostgreSQL, implements tiered rate limiting, use Zod for validation and Express for the web framework.

## Table of Contents

- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Project Architecture](#project-architecture)
- [API Endpoints](#api-endpoints)
- [Design Decisions](#design-decisions)
- [Known Limitations](#known-limitations)

## Installation & Setup

### Prerequisites

- Node.js (v18+)
- pnpm (preferred package manager)
- PostgreSQL (v14+)
- AWS account (for S3, SQS, and SES functionality)

If you don't have pnpm installed, you can install it using:

```bash
npm install -g pnpm
```

### Setup Steps

1. Clone the repository

```bash
git clone <repository-url>
cd Peer-to-Peer-Payment-Splitter
```

2. Install dependencies

```bash
pnpm install
```

3. Set up environment variables

```bash
cp .env.example .env
```

Then edit the `.env` file with your specific configuration:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/payment_splitter"

# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# SQS Configuration
AWS_SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/your-account-id/your-queue-name"

# S3 Configuration
AWS_S3_BUCKET_NAME="your-bucket-name"

# SES Configuration
AWS_SES_EMAIL_SENDER="no-reply@yourdomain.com"
```

4. Set up the database

```bash
npx prisma migrate dev
```

## Running the Application

### Development Mode

```bash
pnpm dev
```

### Production Mode

```bash
pnpm build
pnpm start
```

## Project Architecture

This application follows a modular monolith architecture with clear separation of concerns. The codebase is organized by features, with each feature having its own set of layers:

```
src/
├── app.ts             # Express application setup
├── server.ts          # Server entry point
├── core/              # Shared core modules
│   ├── container.ts   # Dependency injection container
│   ├── error/         # Error handling utilities
│   ├── events/        # Event bus and handlers
│   ├── logger.js      # Application logger
│   └── middleware/    # Express middleware (including rate limiting)
├── features/          # Feature modules
│   ├── users/         # User management
│   │   ├── api/       # HTTP controllers
│   │   ├── application/ # Service layer
│   │   └── repository/ # Data access layer
│   ├── groups/        # Group management
│   ├── expenses/      # Expense management
│   ├── settlements/   # Settlement management
│   └── csv/           # CSV processing
prisma/
└── schema.prisma      # Database schema
```

### Key Architectural Patterns

- **Dependency Injection**: Centralized in `container.ts` for better testability and modularity
- **Repository Pattern**: Abstracting database access
- **Service Layer**: Business logic encapsulation
- **Event-Driven Architecture**: Using AWS SQS for asynchronous processing
- **Strategy Pattern**: For expense splitting calculations

## API Endpoints

A HAR (HTTP Archive) file is included in the repository (`peer_to_peer_payment_splitter.har`) that contains sample API requests and responses. This file can be imported into tools like Postman, Insomnia, or your browser's developer tools to test the API endpoints.

## Design Decisions

### Rate Limiting

Implemented tiered rate limiting with different thresholds for:

- General API endpoints
- Authentication-related operations
- Resource-intensive operations

### Data Storage

- Using Prisma ORM with PostgreSQL for relational data
- Monetary values are stored as integers (cents) to avoid floating-point precision issues
- Appropriate indexes have been added to optimize query performance

### Event Processing

- Asynchronous event processing through AWS SQS
- Events for expense creation, notifications, and CSV processing
- Central event consumer for handling all event types

## Known Limitations

- The SES service uses mocked responses when proper AWS SES configurations are not available
- In-memory rate limiting, when scaled to multiple instances, should be migrated to Redis
- Additional monitoring and observability should be implemented for production use
- Monolithic architecture, but the modularity of the codebase makes it more easier to refactor to microservices
- Monolithic architecture, core can be extracted to libs to Producer, Consumer, Notification etc
- Need to analyze DB for strategies for replication and pool connections to optimize performance
- Add caching layer for frequently accessed data
- Authorization layer is not implemented
- CSV financial transactions are currently processed synchronously for data consistency. Future optimization could explore controlled asynchronous processing where transaction dependencies allow.
