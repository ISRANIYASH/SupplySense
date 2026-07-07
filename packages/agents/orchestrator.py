"""
SupplySense — AI Agent Orchestrator
Manages all 8 autonomous CrewAI agents for supply chain operations.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any, Optional

from crewai import Agent, Crew, Process, Task
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")
# TODO: Add real GPT-4o API key to .env
USE_MOCK = OPENAI_API_KEY == "YOUR_OPENAI_API_KEY"

if not USE_MOCK:
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.1,
        api_key=OPENAI_API_KEY,
        max_tokens=2048,
    )
else:
    llm = None
    logger.warning("OpenAI API key not configured. Agents will use mock responses.")


def _get_llm():
    """Return LLM or raise informative error if not configured."""
    if USE_MOCK:
        return None
    return llm


# ─────────────────────────────────────────────────────────────────
# AGENT DEFINITIONS
# ─────────────────────────────────────────────────────────────────

class DemandSensingAgent:
    """
    Agent 1: Demand Sensing
    Monitors real-time demand signals from all channels and updates forecasts.
    Trigger: Every 15 minutes or on significant demand signal event.
    """

    NAME = "demand_sensing_agent"
    DISPLAY_NAME = "Demand Sensing Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="Senior Demand Intelligence Analyst",
            goal=(
                "Monitor real-time demand signals from all channels (POS, e-commerce, EDI, "
                "social sentiment) and identify significant deviations from baseline forecasts. "
                "Update demand forecasts and trigger alerts when deviation exceeds thresholds."
            ),
            backstory=(
                "You are an expert demand sensing analyst with 15 years of experience in "
                "consumer goods and electronics supply chains. You combine statistical analysis "
                "with market intelligence to detect demand shifts before they impact inventory."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        """Execute demand sensing analysis."""
        if USE_MOCK:
            return cls._mock_result(context)
        
        agent = cls.create()
        task = Task(
            description=(
                f"Analyze current demand signals for the supply chain. Context: {context}. "
                "1. Identify SKUs with demand deviation > 15% from 30-day baseline. "
                "2. Classify each deviation: trend shift, seasonal anomaly, or one-time event. "
                "3. Recommend forecast adjustment for each impacted SKU. "
                "4. Flag any SKUs at risk of stockout in the next 14 days. "
                "Return structured JSON with: affected_skus, severity, recommendations, alerts."
            ),
            agent=agent,
            expected_output="JSON with demand analysis and recommendations",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "demand_alert",
            "confidence": 0.87,
            "recommendation": (
                "Detected +34% demand surge for SKU-4421 (Consumer Electronics) vs 30-day baseline. "
                "Driven by viral social media trend. Recommend increasing reorder qty by 2,000 units. "
                "Current stock will cover only 8 days at current burn rate."
            ),
            "affected_skus": ["SKU-4421", "SKU-4422", "SKU-7891"],
            "severity": "HIGH",
            "alerts": [
                {"sku": "SKU-4421", "deviation": "+34%", "days_to_stockout": 8, "action": "URGENT_REORDER"},
                {"sku": "SKU-7891", "deviation": "+18%", "days_to_stockout": 21, "action": "MONITOR"},
            ],
            "estimated_impact_usd": 247000,
            "requires_approval": True,
        }


class SupplierIntelligenceAgent:
    """
    Agent 2: Supplier Intelligence
    Monitors supplier health, financial stability, geopolitical risk, and news.
    Trigger: Every 6 hours or on supplier-related events.
    """

    NAME = "supplier_intelligence_agent"
    DISPLAY_NAME = "Supplier Intelligence Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="Supply Chain Risk Intelligence Analyst",
            goal=(
                "Monitor all suppliers for financial health, geopolitical risks, ESG compliance, "
                "and operational performance. Identify suppliers at risk and recommend alternatives."
            ),
            backstory=(
                "You are a seasoned supply chain risk analyst who has worked with Fortune 500 "
                "companies across automotive, tech, and pharma sectors. You specialize in "
                "multi-factor supplier scoring and early warning systems."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        if USE_MOCK:
            return cls._mock_result(context)
        
        agent = cls.create()
        task = Task(
            description=(
                f"Analyze supplier portfolio health. Context: {context}. "
                "1. Score each supplier on: financial health, OTIF, quality, ESG, geopolitical risk. "
                "2. Identify suppliers with risk score > 70/100. "
                "3. For high-risk suppliers, recommend qualified alternatives. "
                "4. Flag any contract expiries in the next 90 days. "
                "Return structured JSON with risk scores and recommendations."
            ),
            agent=agent,
            expected_output="JSON with supplier risk analysis",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "supplier_risk_update",
            "confidence": 0.92,
            "recommendation": (
                "Foxconn Ltd risk score elevated to 78/100 due to: Taiwan Strait tensions (+20pts), "
                "recent quality audit failures (+15pts), delayed shipments Q2 (+10pts). "
                "Recommend qualifying Flex Ltd and Jabil Inc as secondary suppliers. "
                "Current Foxconn exposure: $4.2M in active POs."
            ),
            "high_risk_suppliers": [
                {"name": "Foxconn Ltd", "risk_score": 78, "primary_risk": "Geopolitical"},
                {"name": "Evergreen Maritime", "risk_score": 71, "primary_risk": "Operational"},
            ],
            "recommended_alternatives": [
                {"for_supplier": "Foxconn Ltd", "alternative": "Flex Ltd", "readiness": "90 days"},
            ],
            "contract_expiries_90d": 3,
            "requires_approval": True,
            "estimated_impact_usd": 4200000,
        }


class RiskMonitoringAgent:
    """
    Agent 3: Risk Monitoring
    Monitors global supply chain disruption signals continuously.
    Trigger: Continuous (Kafka stream) or every 5 minutes.
    """

    NAME = "risk_monitoring_agent"
    DISPLAY_NAME = "Risk Monitoring Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="Global Supply Chain Risk Monitor",
            goal=(
                "Continuously monitor global events, weather patterns, geopolitical developments, "
                "and port disruptions that could impact the supply chain. "
                "Classify risks and estimate financial impact."
            ),
            backstory=(
                "You are a global risk intelligence specialist with expertise in geopolitical "
                "analysis, climate risk, and logistics disruption modeling. You've worked for "
                "Lloyd's of London and major shipping companies."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        if USE_MOCK:
            return cls._mock_result(context)
        
        agent = cls.create()
        task = Task(
            description=(
                f"Analyze current global risk landscape for supply chain. Context: {context}. "
                "1. Identify active disruption events (weather, geopolitical, labor, pandemic). "
                "2. Score each by: probability (0-100%), financial impact ($), affected regions. "
                "3. Map disruptions to affected suppliers and SKUs. "
                "4. Recommend mitigation actions with cost-benefit analysis. "
                "Return structured JSON with risk events and mitigation recommendations."
            ),
            agent=agent,
            expected_output="JSON with risk analysis and mitigation plans",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "risk_alert",
            "confidence": 0.89,
            "recommendation": (
                "3 HIGH severity risk events detected: "
                "(1) Port of Liverpool dock worker strike planned for July 15 — affects 18% of EU imports. "
                "(2) Category 4 hurricane tracking toward Gulf Coast — potential disruption to 8 suppliers. "
                "(3) China semiconductor export restrictions tightening — SKU-4421 supply at risk. "
                "Recommend activating contingency inventory buffers and alternative routing via Rotterdam."
            ),
            "active_risks": [
                {"event": "Liverpool Port Strike", "probability": 78, "impact_usd": 3400000, "severity": "HIGH"},
                {"event": "Gulf Coast Hurricane", "probability": 62, "impact_usd": 8700000, "severity": "HIGH"},
                {"event": "China Semiconductor Restrictions", "probability": 45, "impact_usd": 12000000, "severity": "CRITICAL"},
            ],
            "requires_approval": False,  # Risk alerts don't need approval, just notification
            "total_exposure_usd": 24100000,
        }


class AutoProcurementAgent:
    """
    Agent 4: Auto-Procurement
    Generates purchase orders when stock hits reorder points.
    Trigger: On inventory event (stock below reorder point).
    """

    NAME = "auto_procurement_agent"
    DISPLAY_NAME = "Auto-Procurement Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="Autonomous Procurement Specialist",
            goal=(
                "Monitor inventory levels and automatically generate optimized purchase orders "
                "when stock hits reorder points. Consider supplier performance, lead times, "
                "quantity discounts, and demand forecasts to determine optimal order quantities."
            ),
            backstory=(
                "You are a procurement automation expert with deep knowledge of supply chain "
                "optimization, vendor negotiations, and inventory theory. You balance cost, "
                "service level, and working capital to find the optimal PO parameters."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        if USE_MOCK:
            return cls._mock_result(context)

        agent = cls.create()
        task = Task(
            description=(
                f"Generate purchase orders for items below reorder point. Context: {context}. "
                "1. Identify all SKUs below reorder point or safety stock. "
                "2. For each, calculate EOQ using: demand rate, ordering cost, holding cost. "
                "3. Select best supplier based on: price, lead time, quality score, risk score. "
                "4. Apply quantity discount tiers. "
                "5. Draft PO with: supplier, SKU, quantity, price, expected delivery, priority. "
                "Return JSON with draft POs for human approval."
            ),
            agent=agent,
            expected_output="JSON with draft purchase orders",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "purchase_order_draft",
            "confidence": 0.95,
            "recommendation": (
                "Generated 3 purchase orders totaling $847,200. "
                "SKU-8812: 12,000 units from Supplier A ($324,000) — EOQ optimized, 15% quantity discount applied. "
                "SKU-2241: 8,500 units from Supplier B ($198,400) — expedited shipping recommended. "
                "SKU-6614: 5,200 units from Supplier C ($124,800) — switched from Foxconn due to risk score."
            ),
            "draft_pos": [
                {
                    "po_number": "AI-PO-2024-0847",
                    "supplier": "Amphenol Corp",
                    "sku": "SKU-8812",
                    "quantity": 12000,
                    "unit_price": 27.00,
                    "total_amount": 324000,
                    "lead_time_days": 21,
                    "priority": "NORMAL",
                },
                {
                    "po_number": "AI-PO-2024-0848",
                    "supplier": "Molex Inc",
                    "sku": "SKU-2241",
                    "quantity": 8500,
                    "unit_price": 23.34,
                    "total_amount": 198400,
                    "lead_time_days": 14,
                    "priority": "URGENT",
                },
            ],
            "total_value_usd": 847200,
            "requires_approval": True,
            "savings_vs_spot_market": 43200,
        }


class InventoryRebalancingAgent:
    """
    Agent 5: Inventory Rebalancing
    Optimizes stock distribution across distribution centers.
    Trigger: Daily at 2am or on imbalance detection.
    """

    NAME = "inventory_rebalancing_agent"
    DISPLAY_NAME = "Inventory Rebalancing Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="Inventory Network Optimization Specialist",
            goal=(
                "Optimize inventory distribution across all distribution centers to minimize "
                "total supply chain cost while meeting service level targets. "
                "Identify imbalances and recommend inter-DC transfers."
            ),
            backstory=(
                "You are an operations research expert specializing in multi-echelon inventory "
                "optimization. You've designed inventory systems for Amazon, Walmart, and major "
                "3PL providers. You use OR-Tools and simulation to find optimal transfer plans."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        if USE_MOCK:
            return cls._mock_result(context)

        agent = cls.create()
        task = Task(
            description=(
                f"Optimize inventory distribution across DCs. Context: {context}. "
                "1. Analyze current stock levels at each DC against regional demand. "
                "2. Identify SKUs with excess stock in one DC and shortage in another. "
                "3. Calculate transfer costs vs. stockout costs for each potential transfer. "
                "4. Generate optimal transfer plan with specific quantities and routing. "
                "5. Estimate total cost savings from rebalancing. "
                "Return JSON with transfer recommendations."
            ),
            agent=agent,
            expected_output="JSON with inventory transfer plan",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "inventory_transfer",
            "confidence": 0.91,
            "recommendation": (
                "Identified 7 inter-DC transfer opportunities saving $127,400 in prevented stockouts. "
                "Primary action: Transfer 3,500 units SKU-4421 from Dallas DC (120 days supply) "
                "to New York DC (2 days supply). Transfer cost: $8,400 vs avoided stockout cost: $94,500."
            ),
            "transfers": [
                {
                    "sku": "SKU-4421",
                    "from_dc": "Dallas, TX",
                    "to_dc": "New York, NY",
                    "quantity": 3500,
                    "transfer_cost": 8400,
                    "avoided_stockout_cost": 94500,
                    "net_benefit": 86100,
                },
            ],
            "total_net_benefit_usd": 127400,
            "requires_approval": True,
        }


class LogisticsAgent:
    """
    Agent 6: Logistics & Route Optimization
    Optimizes shipping routes, carrier selection, and ETA predictions.
    Trigger: On new shipment event or daily routing run.
    """

    NAME = "logistics_agent"
    DISPLAY_NAME = "Logistics Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="Logistics and Transportation Optimization Expert",
            goal=(
                "Optimize shipping routes, select best carriers, predict ETAs, and "
                "minimize logistics costs while meeting delivery SLAs. "
                "Proactively identify shipments at risk of delay."
            ),
            backstory=(
                "You are a logistics optimization expert who has designed routing algorithms "
                "for global 3PLs. You combine operations research with real-time data "
                "from carrier APIs to achieve 15-20% cost reduction and 98%+ on-time delivery."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        if USE_MOCK:
            return cls._mock_result(context)

        agent = cls.create()
        task = Task(
            description=(
                f"Optimize logistics and routing. Context: {context}. "
                "1. Review all open shipments and current carrier performance. "
                "2. Identify shipments at risk of delay (>24h). "
                "3. For delayed shipments, recommend alternative carriers or routes. "
                "4. Optimize route plans for next 48 hours using vehicle routing. "
                "5. Predict ETAs for all active shipments. "
                "Return JSON with routing recommendations and delay alerts."
            ),
            agent=agent,
            expected_output="JSON with logistics optimization results",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "route_optimization",
            "confidence": 0.88,
            "recommendation": (
                "4 shipments at delay risk due to Liverpool port congestion. "
                "Recommended rerouting via Rotterdam saves 3.2 days avg delay. "
                "Additional cost: $12,400 vs customer penalty risk: $87,000. "
                "Route optimization for 23 outbound trucks saved $34,200 in fuel costs."
            ),
            "delay_alerts": 4,
            "route_savings_usd": 34200,
            "rerouting_cost": 12400,
            "penalty_avoided": 87000,
            "requires_approval": True,
        }


class ComplianceESGAgent:
    """
    Agent 7: Compliance & ESG Monitoring
    Monitors regulatory compliance and ESG performance across the supply chain.
    Trigger: Weekly or on supplier change events.
    """

    NAME = "compliance_esg_agent"
    DISPLAY_NAME = "Compliance & ESG Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="Supply Chain Compliance and ESG Analyst",
            goal=(
                "Monitor regulatory compliance (SOX, ISO 28000, customs regulations) and "
                "ESG performance (carbon footprint, labor standards, environmental impact) "
                "across all suppliers and logistics operations."
            ),
            backstory=(
                "You are a supply chain compliance expert with certifications in ISO 28000, "
                "CSDDD, and ESG reporting frameworks. You've helped Fortune 100 companies "
                "achieve supply chain transparency and avoid regulatory penalties."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        if USE_MOCK:
            return cls._mock_result(context)

        agent = cls.create()
        task = Task(
            description=(
                f"Analyze compliance and ESG status. Context: {context}. "
                "1. Review supplier ESG scores and identify those below threshold (< 60/100). "
                "2. Check for regulatory compliance violations or upcoming deadlines. "
                "3. Calculate Scope 3 carbon emissions from supply chain. "
                "4. Flag labor rights risks in tier-2/3 suppliers. "
                "5. Generate compliance report with action items. "
                "Return JSON with compliance status and recommendations."
            ),
            agent=agent,
            expected_output="JSON with compliance and ESG analysis",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "compliance_alert",
            "confidence": 0.94,
            "recommendation": (
                "2 suppliers below ESG threshold require action within 30 days. "
                "Guangzhou Manufacturing: Carbon intensity 340 tCO2e/M$ (threshold: 200). "
                "Vietnam Textiles: Labor audit score 48/100 — CSDDD violation risk. "
                "Recommend: Issue improvement notices, schedule re-audits, and prepare alternatives."
            ),
            "compliance_violations": 2,
            "esg_below_threshold": 2,
            "scope3_emissions_mtco2e": 12400,
            "regulatory_deadlines_30d": 1,
            "requires_approval": False,
        }


class SelfLearningAgent:
    """
    Agent 8: Self-Learning & Retraining
    Monitors model performance and triggers retraining when drift detected.
    Trigger: Daily at 3am or when drift score exceeds threshold.
    """

    NAME = "learning_agent"
    DISPLAY_NAME = "Self-Learning Agent"

    @classmethod
    def create(cls) -> Agent:
        return Agent(
            role="MLOps and Model Quality Specialist",
            goal=(
                "Monitor all ML model performance metrics, detect data and concept drift, "
                "trigger retraining when performance degrades, and ensure model quality "
                "through automated champion/challenger testing."
            ),
            backstory=(
                "You are an MLOps engineer with deep expertise in production ML systems. "
                "You've built drift detection pipelines for Google and Netflix, and specialize "
                "in keeping forecasting models accurate over time as supply chain dynamics change."
            ),
            llm=_get_llm(),
            verbose=True,
            allow_delegation=False,
            max_iter=5,
        )

    @classmethod
    def run_task(cls, context: dict) -> dict:
        if USE_MOCK:
            return cls._mock_result(context)

        agent = cls.create()
        task = Task(
            description=(
                f"Analyze model performance and trigger retraining if needed. Context: {context}. "
                "1. Calculate current MAPE, RMSE for all deployed models. "
                "2. Run Evidently AI drift detection (data + concept drift). "
                "3. Compare champion vs challenger model performance. "
                "4. If drift detected or performance degraded > 5%, trigger retraining. "
                "5. After retraining, run A/B test and promote if challenger wins. "
                "Return JSON with model health status and retraining decisions."
            ),
            agent=agent,
            expected_output="JSON with model performance and retraining status",
        )
        crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
        result = crew.kickoff()
        return {"agent": cls.NAME, "result": str(result), "timestamp": datetime.utcnow().isoformat()}

    @classmethod
    def _mock_result(cls, context: dict) -> dict:
        return {
            "agent": cls.NAME,
            "agent_display_name": cls.DISPLAY_NAME,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat(),
            "decision_type": "model_retraining",
            "confidence": 0.96,
            "recommendation": (
                "TFT Forecaster v2.2 MAPE degraded from 3.8% to 5.1% (threshold: 5.0%). "
                "Data drift detected in 'weather_index' and 'competitor_price' features. "
                "Triggering automated retraining with last 180 days of data. "
                "New challenger model (v2.3) will be shadow-deployed for 48h evaluation."
            ),
            "models_evaluated": 4,
            "drift_detected": True,
            "retraining_triggered": True,
            "performance_delta": {"tft_mape": "+1.3%", "lstm_mape": "+0.4%"},
            "requires_approval": False,
        }


# ─────────────────────────────────────────────────────────────────
# ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────

class AgentOrchestrator:
    """
    Orchestrates all 8 SupplySense AI agents.
    Manages scheduling, execution, and result routing.
    """

    AGENTS = {
        DemandSensingAgent.NAME: DemandSensingAgent,
        SupplierIntelligenceAgent.NAME: SupplierIntelligenceAgent,
        RiskMonitoringAgent.NAME: RiskMonitoringAgent,
        AutoProcurementAgent.NAME: AutoProcurementAgent,
        InventoryRebalancingAgent.NAME: InventoryRebalancingAgent,
        LogisticsAgent.NAME: LogisticsAgent,
        ComplianceESGAgent.NAME: ComplianceESGAgent,
        SelfLearningAgent.NAME: SelfLearningAgent,
    }

    AGENT_DISPLAY_NAMES = {
        DemandSensingAgent.NAME: DemandSensingAgent.DISPLAY_NAME,
        SupplierIntelligenceAgent.NAME: SupplierIntelligenceAgent.DISPLAY_NAME,
        RiskMonitoringAgent.NAME: RiskMonitoringAgent.DISPLAY_NAME,
        AutoProcurementAgent.NAME: AutoProcurementAgent.DISPLAY_NAME,
        InventoryRebalancingAgent.NAME: InventoryRebalancingAgent.DISPLAY_NAME,
        LogisticsAgent.NAME: LogisticsAgent.DISPLAY_NAME,
        ComplianceESGAgent.NAME: ComplianceESGAgent.DISPLAY_NAME,
        SelfLearningAgent.NAME: SelfLearningAgent.DISPLAY_NAME,
    }

    @classmethod
    def run_agent(cls, agent_name: str, context: Optional[dict] = None) -> dict:
        """Run a specific agent by name."""
        if agent_name not in cls.AGENTS:
            raise ValueError(f"Unknown agent: {agent_name}. Available: {list(cls.AGENTS.keys())}")
        
        agent_cls = cls.AGENTS[agent_name]
        context = context or {}
        
        logger.info(f"Running agent: {agent_name}")
        try:
            result = agent_cls.run_task(context)
            result["status"] = "completed"
            return result
        except Exception as e:
            logger.error(f"Agent {agent_name} failed: {e}")
            return {
                "agent": agent_name,
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    @classmethod
    def get_all_statuses(cls) -> list[dict]:
        """Return mock status for all 8 agents (for dashboard display)."""
        import random
        statuses = ["running", "idle", "completed", "alert"]
        result = []
        for name, display_name in cls.AGENT_DISPLAY_NAMES.items():
            result.append({
                "name": name,
                "display_name": display_name,
                "status": random.choice(statuses),
                "last_run": datetime.utcnow().isoformat(),
                "decisions_today": random.randint(0, 12),
                "accuracy_rate": round(random.uniform(0.85, 0.97), 3),
                "pending_approvals": random.randint(0, 5),
            })
        return result

    @classmethod
    def run_all(cls, context: Optional[dict] = None) -> list[dict]:
        """Run all agents sequentially."""
        results = []
        for agent_name in cls.AGENTS:
            result = cls.run_agent(agent_name, context)
            results.append(result)
        return results
