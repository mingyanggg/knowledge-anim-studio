use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// HMAC signing secret - used to verify activation codes
const SIGNING_SECRET: &[u8] = b"knowledge-anim-studio-pro-signing-key-2026";

/// License storage directory
const LICENSE_DIR: &str = ".knowledge-anim-studio";
const LICENSE_FILE: &str = "license.json";

/// Pro plan types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PlanType {
    Monthly,
    Yearly,
    Lifetime,
}

impl PlanType {
    /// Days of validity for each plan
    pub fn duration_days(&self) -> u64 {
        match self {
            PlanType::Monthly => 30,
            PlanType::Yearly => 365,
            PlanType::Lifetime => 36500, // ~100 years
        }
    }

    /// Character code for encoding
    #[allow(dead_code)]
    pub fn code_char(&self) -> char {
        match self {
            PlanType::Monthly => 'M',
            PlanType::Yearly => 'Y',
            PlanType::Lifetime => 'L',
        }
    }

    /// Parse from character code
    pub fn from_code_char(c: char) -> Option<Self> {
        match c {
            'M' => Some(PlanType::Monthly),
            'Y' => Some(PlanType::Yearly),
            'L' => Some(PlanType::Lifetime),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubscriptionStatus {
    pub is_pro: bool,
    pub plan_type: Option<String>,
    pub expiry_date: Option<String>,
    pub activated_at: Option<String>,
    pub days_remaining: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivationResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct LicenseData {
    code: String,
    plan_type: String,
    activated_at: i64,
    expires_at: i64,
}

/// Get the license file path
fn license_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "Cannot determine HOME directory".to_string())?;
    let dir = PathBuf::from(home).join(LICENSE_DIR);
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create license dir: {}", e))?;
    Ok(dir.join(LICENSE_FILE))
}

/// Load existing license from disk
fn load_license() -> Result<Option<LicenseData>, String> {
    let path = license_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read license: {}", e))?;
    let data: LicenseData = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid license file: {}", e))?;
    Ok(Some(data))
}

/// Save license to disk
fn save_license(data: &LicenseData) -> Result<(), String> {
    let path = license_path()?;
    let content = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize license: {}", e))?;
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write license: {}", e))?;
    Ok(())
}

/// Generate HMAC-SHA256 signature
fn sign(data: &str) -> String {
    let mac = hmac_sha256::HMAC::mac(data.as_bytes(), SIGNING_SECRET);
    hex::encode(mac)
}

/// Generate an activation code
#[allow(dead_code)]
pub fn generate_activation_code(plan: PlanType, created_at: Option<i64>) -> String {
    let now = created_at.unwrap_or_else(|| {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    });

    // Code format: KAS-{PLAN}{TIMESTAMP}{SIGNATURE}
    // Example: KAS-Y1743000000-a1b2c3d4...
    let payload = format!("{}{}{}", plan.code_char(), now, "knowledge-anim");
    let sig = sign(&payload);
    let short_sig = &sig[..16]; // Use first 16 chars of signature
    format!("KAS-{}{}{}", plan.code_char(), now, short_sig)
}

/// Validate an activation code and extract plan + timestamp
fn validate_code(code: &str) -> Result<(PlanType, i64), String> {
    // Expected format: KAS-{PLAN}{TIMESTAMP}{SIGNATURE16}
    if !code.starts_with("KAS-") || code.len() < 6 {
        return Err("无效的激活码格式".to_string());
    }

    let body = &code[4..];
    if body.len() < 18 {
        return Err("激活码长度不正确".to_string());
    }

    let plan_char = body.chars().next().unwrap();
    let plan = PlanType::from_code_char(plan_char)
        .ok_or_else(|| "无效的订阅类型".to_string())?;

    // Extract timestamp (chars 1..11 = 10 digits)
    let ts_str: String = body.chars().skip(1).take(10).collect();
    let timestamp: i64 = ts_str
        .parse()
        .map_err(|_| "无效的时间戳".to_string())?;

    // Extract signature (remaining chars)
    let provided_sig: String = body.chars().skip(11).collect();

    // Verify signature
    let payload = format!("{}{}{}", plan_char, timestamp, "knowledge-anim");
    let expected_sig = &sign(&payload)[..16];

    if provided_sig != expected_sig {
        return Err("激活码签名验证失败，请检查是否输入正确".to_string());
    }

    // Reject codes from the future (more than 1 hour ahead)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    if timestamp > now + 3600 {
        return Err("激活码无效".to_string());
    }

    Ok((plan, timestamp))
}

/// Check current subscription status
#[tauri::command]
pub async fn check_subscription() -> Result<SubscriptionStatus, String> {
    match load_license()? {
        None => Ok(SubscriptionStatus {
            is_pro: false,
            plan_type: None,
            expiry_date: None,
            activated_at: None,
            days_remaining: None,
        }),
        Some(license) => {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let is_expired = license.expires_at < now;
            let is_pro = !is_expired;

            let activated_str = chrono_datetime_from_timestamp(license.activated_at);
            let expiry_str = chrono_datetime_from_timestamp(license.expires_at);
            let days_remaining = if is_expired {
                None
            } else {
                Some((license.expires_at - now) / 86400)
            };

            // Auto-clean expired license file
            if is_expired {
                if let Ok(path) = license_path() {
                    let _ = std::fs::remove_file(path);
                }
            }

            Ok(SubscriptionStatus {
                is_pro,
                plan_type: if is_pro { Some(license.plan_type.clone()) } else { None },
                expiry_date: if is_pro { Some(expiry_str) } else { None },
                activated_at: if is_pro { Some(activated_str) } else { None },
                days_remaining,
            })
        }
    }
}

/// Activate a subscription code
#[tauri::command]
pub async fn activate_code(code: String) -> Result<ActivationResult, String> {
    let trimmed = code.trim().to_string();

    // Check if already activated
    if let Some(existing) = load_license()? {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        if existing.expires_at > now && existing.code == trimmed {
            return Ok(ActivationResult {
                success: false,
                message: "该激活码已在本机使用".to_string(),
            });
        }
    }

    // Validate code
    let (plan, _timestamp) = validate_code(&trimmed)?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let plan_str = match plan {
        PlanType::Monthly => "monthly".to_string(),
        PlanType::Yearly => "yearly".to_string(),
        PlanType::Lifetime => "lifetime".to_string(),
    };

    let license = LicenseData {
        code: trimmed,
        plan_type: plan_str,
        activated_at: now,
        expires_at: now + plan.duration_days() as i64 * 86400,
    };

    save_license(&license)?;

    let plan_name = match plan {
        PlanType::Monthly => "月度 Pro",
        PlanType::Yearly => "年度 Pro",
        PlanType::Lifetime => "永久 Pro",
    };

    Ok(ActivationResult {
        success: true,
        message: format!("激活成功！已开通{}会员", plan_name),
    })
}

/// Deactivate subscription (delete license)
#[tauri::command]
pub async fn deactivate_subscription() -> Result<(), String> {
    let path = license_path()?;
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Failed to remove license: {}", e))?;
    }
    Ok(())
}

/// Helper: format timestamp to readable date
fn chrono_datetime_from_timestamp(ts: i64) -> String {
    // Simple date formatting without chrono dependency
    let secs = ts as u64;
    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;

    // Days from epoch to a rough date
    let (year, month, day) = days_to_date(days);
    format!("{}-{:02}-{:02} {:02}:{:02}", year, month, day, hours, minutes)
}

/// Convert days since epoch to (year, month, day)
fn days_to_date(days_since_epoch: u64) -> (i32, u32, u32) {
    // Simplified conversion
    let mut days = days_since_epoch;
    let year = (1970i32..).find(|&y| {
        let days_in_year = if is_leap(y) { 366 } else { 365 };
        if days < days_in_year {
            true
        } else {
            days -= days_in_year;
            false
        }
    }).unwrap_or(2026);

    let month = (1u32..=12).find(|&m| {
        let days_in_month = days_in_month(year, m);
        if days < days_in_month {
            true
        } else {
            days -= days_in_month;
            false
        }
    }).unwrap_or(1);

    (year, month, (days + 1) as u32)
}

fn is_leap(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_in_month(year: i32, month: u32) -> u64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap(year) { 29 } else { 28 },
        _ => 30,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_code_generation_and_validation() {
        // Generate codes for each plan
        let code_monthly = generate_activation_code(PlanType::Monthly, None);
        let code_yearly = generate_activation_code(PlanType::Yearly, None);
        let code_lifetime = generate_activation_code(PlanType::Lifetime, None);

        // All should validate
        assert!(validate_code(&code_monthly).is_ok());
        assert!(validate_code(&code_yearly).is_ok());
        assert!(validate_code(&code_lifetime).is_ok());

        // Plan types should be correct
        assert_eq!(validate_code(&code_monthly).unwrap().0, PlanType::Monthly);
        assert_eq!(validate_code(&code_yearly).unwrap().0, PlanType::Yearly);
        assert_eq!(validate_code(&code_lifetime).unwrap().0, PlanType::Lifetime);

        // Tampered code should fail
        let mut tampered = code_yearly.clone();
        tampered.push('X');
        assert!(validate_code(&tampered).is_err());
    }
}
