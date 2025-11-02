"""
Simple in-memory database service for Event Rescue
"""
from typing import List, Dict, Any, Optional
from datetime import datetime

# In-memory storage for incidents and lost&found
_incidents: List[Dict[str, Any]] = []
_lost_found_reports: List[Dict[str, Any]] = []

def add_incident(incident_data: Dict[str, Any]) -> Dict[str, Any]:
    """Add a new incident to the database."""
    incident = {
        "id": len(_incidents) + 1,
        "timestamp": datetime.now().isoformat(),
        **incident_data
    }
    _incidents.append(incident)
    return incident

def list_incidents() -> List[Dict[str, Any]]:
    """List all incidents."""
    return _incidents.copy()

def get_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
    """Get incident by ID."""
    try:
        id_int = int(incident_id)
        for incident in _incidents:
            if incident.get("id") == id_int:
                return incident
    except ValueError:
        pass
    return None

def update_incident(incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an incident."""
    incident = get_incident_by_id(incident_id)
    if incident:
        incident.update(updates)
        return incident
    return None

def delete_incident(incident_id: str) -> bool:
    """Delete an incident."""
    try:
        id_int = int(incident_id)
        for i, incident in enumerate(_incidents):
            if incident.get("id") == id_int:
                del _incidents[i]
                return True
    except ValueError:
        pass
    return False

# Lost & Found storage helpers
def add_lost_found(report: Dict[str, Any]) -> Dict[str, Any]:
    item = {
        "id": len(_lost_found_reports) + 1,
        "timestamp": datetime.now().isoformat(),
        **report,
    }
    _lost_found_reports.append(item)
    return item

def list_lost_found() -> List[Dict[str, Any]]:
    return list(_lost_found_reports)
