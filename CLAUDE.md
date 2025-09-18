# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Information

**Project Name**: Tribe MVP
**Description**: Smart baby update distribution platform
**Linear Project ID**: 76e4b902-0484-480e-bd8a-c151c003211f

## Repository Overview

This repository contains a comprehensive collection of 86 specialized AI subagents for Claude Code, providing domain-specific expertise across software development, infrastructure, and business operations. The repository is organized as a subagent library that extends Claude Code's capabilities with specialized knowledge.

## Repository Structure

```
tribe_mvp/
├── .claude/
│   └── settings.local.json          # Claude Code configuration
└── agents/                          # Main subagent collection (86 agents)
    ├── README.md                    # Comprehensive documentation
    ├── examples/
    │   └── tdd-usage.md            # Usage examples
    ├── .github/                     # GitHub configuration
    ├── .git/                        # Git repository
    └── [agent-name].md              # Individual agent files
```

## Subagent Categories

The repository contains 86 specialized subagents organized into the following categories:

### Architecture & System Design (7 agents)
- **backend-architect**: RESTful API design, microservice boundaries, database schemas
- **cloud-architect**: AWS/Azure/GCP infrastructure design and cost optimization
- **graphql-architect**: GraphQL schemas, resolvers, federation architecture
- **hybrid-cloud-architect**: Multi-cloud strategies across cloud and on-premises
- **kubernetes-architect**: Cloud-native infrastructure with Kubernetes and GitOps
- **architect-reviewer**: Architectural consistency analysis and pattern validation

### Programming Languages (18 agents)
- **Systems**: c-pro, cpp-pro, rust-pro, golang-pro
- **Web**: javascript-pro, typescript-pro, python-pro, ruby-pro, php-pro
- **Enterprise**: java-pro, csharp-pro, scala-pro
- **Mobile**: ios-developer, flutter-expert, mobile-developer
- **Specialized**: elixir-pro, unity-developer, minecraft-bukkit-pro, sql-pro

### Infrastructure & Operations (8 agents)
- **devops-troubleshooter**: Production debugging, log analysis, deployment troubleshooting
- **deployment-engineer**: CI/CD pipelines, containerization, cloud deployments
- **terraform-specialist**: Infrastructure as Code with Terraform modules
- **database-optimizer**: Query optimization, index design, migration strategies
- **database-admin**: Database operations, backup, replication, monitoring
- **incident-responder**: Production incident management and resolution
- **network-engineer**: Network debugging, load balancing, traffic analysis
- **dx-optimizer**: Developer experience optimization

### Quality Assurance & Security (12 agents)
- **code-reviewer**: Code review with security focus and production reliability
- **security-auditor**: Vulnerability assessment and OWASP compliance
- **backend-security-coder**: Secure backend coding practices
- **frontend-security-coder**: XSS prevention, CSP implementation
- **mobile-security-coder**: Mobile security patterns, WebView security
- **test-automator**: Comprehensive test suite creation
- **tdd-orchestrator**: Test-Driven Development methodology
- **debugger**: Error resolution and test failure analysis
- **error-detective**: Log analysis and error pattern recognition
- **performance-engineer**: Application profiling and optimization
- **search-specialist**: Advanced web research and information synthesis

### Data & AI (9 agents)
- **data-scientist**: Data analysis, SQL queries, BigQuery operations
- **data-engineer**: ETL pipelines, data warehouses, streaming architectures
- **ai-engineer**: LLM applications, RAG systems, prompt pipelines
- **ml-engineer**: ML pipelines, model serving, feature engineering
- **mlops-engineer**: ML infrastructure, experiment tracking, model registries
- **prompt-engineer**: LLM prompt optimization and engineering

### Documentation & Technical Writing (6 agents)
- **docs-architect**: Comprehensive technical documentation generation
- **api-documenter**: OpenAPI/Swagger specifications and developer docs
- **reference-builder**: Technical references and API documentation
- **tutorial-engineer**: Step-by-step tutorials and educational content
- **mermaid-expert**: Diagram creation (flowcharts, sequences, ERDs)

### Business & Operations (15 agents)
- **business-analyst**: Metrics analysis, reporting, KPI tracking
- **quant-analyst**: Financial modeling, trading strategies, market analysis
- **risk-manager**: Portfolio risk monitoring and management
- **content-marketer**: Blog posts, social media, email campaigns
- **sales-automator**: Cold emails, follow-ups, proposal generation
- **customer-support**: Support tickets, FAQ responses, customer communication
- **hr-pro**: HR operations, policies, employee relations
- **legal-advisor**: Privacy policies, terms of service, legal documentation

### SEO & Content Optimization (11 agents)
- **seo-content-auditor**: Content quality analysis, E-E-A-T signals
- **seo-meta-optimizer**: Meta title and description optimization
- **seo-keyword-strategist**: Keyword analysis and semantic variations
- **seo-structure-architect**: Content structure and schema markup
- **seo-snippet-hunter**: Featured snippet formatting
- **seo-content-refresher**: Content freshness analysis
- **seo-cannibalization-detector**: Keyword overlap detection
- **seo-authority-builder**: E-E-A-T signal analysis
- **seo-content-writer**: SEO-optimized content creation
- **seo-content-planner**: Content planning and topic clusters

## Model Distribution

Subagents are optimized for specific Claude model tiers based on task complexity:

- **Haiku (11 agents)**: Quick, focused tasks with minimal computational overhead
- **Sonnet (46 agents)**: Standard development and specialized engineering tasks
- **Opus (21 agents)**: Complex reasoning, architecture, and critical analysis

## Usage Patterns

### Automatic Delegation
Claude Code automatically selects appropriate subagents based on task context and requirements.

### Explicit Invocation
Specify subagents by name for particular expertise:
```
"Use code-reviewer to analyze recent changes"
"Have security-auditor scan for vulnerabilities"
"Get performance-engineer to optimize this bottleneck"
```

### Multi-Agent Workflows
Subagents coordinate automatically for complex tasks with intelligent sequencing:

**Feature Development**: backend-architect → frontend-developer → test-automator → security-auditor
**Performance Optimization**: performance-engineer → database-optimizer → frontend-developer
**Production Incidents**: incident-responder → devops-troubleshooter → error-detective

## Installation and Setup

The subagents are installed in the `~/.claude/agents/` directory and are automatically available to Claude Code once placed there.

## Integration Notes

This repository integrates with:
- [Claude Code Commands](https://github.com/wshobson/commands) - 52 pre-built slash commands for sophisticated multi-agent orchestration
- Claude Code's automatic agent selection system
- Multi-agent workflow coordination patterns

## Development Workflow

When working with this repository:
1. Each subagent is defined in a dedicated .md file with frontmatter
2. Agents use lowercase, hyphen-separated naming conventions
3. Clear activation criteria are defined in agent descriptions
4. Comprehensive system prompts define expertise areas

## Key Files

- `agents/README.md`: Complete documentation and usage guide (23,518 lines)
- `agents/examples/tdd-usage.md`: Usage examples for Test-Driven Development
- `.claude/settings.local.json`: Claude Code permissions configuration