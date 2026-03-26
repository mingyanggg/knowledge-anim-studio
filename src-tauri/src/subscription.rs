use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SubscriptionStatus {
    pub is_pro: bool,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivationResult {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub async fn check_subscription() -> Result<SubscriptionStatus, String> {
    // Mock implementation - replace with actual subscription check
    Ok(SubscriptionStatus {
        is_pro: false,
        expiry_date: None,
    })
}

#[tauri::command]
pub async fn activate_code(code: String) -> Result<ActivationResult, String> {
    // Mock implementation - replace with actual activation API call
    // Accept codes starting with "PRO-"
    if code.starts_with("PRO-") {
        Ok(ActivationResult {
            success: true,
            message: "激活成功！欢迎成为 Pro 用户".to_string(),
        })
    } else {
        Ok(ActivationResult {
            success: false,
            message: "无效的激活码".to_string(),
        })
    }
}

#[tauri::command]
pub async fn deactivate_subscription() -> Result<(), String> {
    // Mock implementation - replace with actual deactivation
    Ok(())
}
