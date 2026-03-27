// Database module for Knowledge Anim Studio
// Manages SQLite database for projects, style presets, cases, and app settings

use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// ==================== Data Structures ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub narration_style: Option<String>,
    pub visual_style: Option<String>,
    pub status: String,
    pub script: Option<String>,
    pub video_path: Option<String>,
    pub duration: Option<f64>,
    pub resolution: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StylePreset {
    pub id: String,
    #[serde(rename = "type")]
    pub preset_type: String,
    pub name: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub config: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Case {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub narration_style: Option<String>,
    pub visual_style: Option<String>,
    pub prompt: Option<String>,
    pub thumbnail_path: Option<String>,
    pub created_at: i64,
}

// ==================== Database Management ====================

fn get_db_path(app: &AppHandle) -> SqliteResult<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");

    // Ensure directory exists
    fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");

    let db_path = app_data_dir.join("studio.db");
    Ok(db_path)
}

fn init_tables(conn: &Connection) -> SqliteResult<()> {
    // Projects table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            narration_style TEXT,
            visual_style TEXT,
            status TEXT DEFAULT 'draft',
            script TEXT,
            video_path TEXT,
            duration REAL,
            resolution TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Style presets table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS style_presets (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT,
            description TEXT,
            config TEXT
        )",
        [],
    )?;

    // Cases table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            narration_style TEXT,
            visual_style TEXT,
            prompt TEXT,
            thumbnail_path TEXT,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    // App settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    Ok(())
}

fn seed_default_data(conn: &Connection) -> SqliteResult<()> {
    // Check if data already seeded
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM style_presets WHERE id LIKE 'default-%'",
        [],
        |row| row.get(0),
    )?;

    if count > 0 {
        return Ok(()); // Already seeded
    }

    let now = chrono::Utc::now().timestamp();

    // Seed visual presets
    let visual_presets: [(&str, &str, &str, Option<&str>, Option<&str>, &str); 4] = [
        (
            "default-deep-space",
            "visual",
            "深空科技",
            Some("🌌"),
            Some("深邃宇宙风格，适合科技主题"),
            "{\"colors\": {\"primary\": \"#00d4ff\", \"secondary\": \"#7c3aed\", \"bg\": \"#1a1a2e\"}}",
        ),
        (
            "default-classic-minimal",
            "visual",
            "经典极简",
            Some("⚪"),
            Some("简洁明快，适合学术演示"),
            "{\"colors\": {\"primary\": \"#2c3e50\", \"secondary\": \"#3498db\", \"bg\": \"#ffffff\"}}",
        ),
        (
            "default-vibrant-campus",
            "visual",
            "活力学院",
            Some("🎨"),
            Some("青春活力，适合校园场景"),
            "{\"colors\": {\"primary\": \"#e17055\", \"secondary\": \"#00cec9\", \"bg\": \"#ffeaa7\"}}",
        ),
        (
            "default-math-classic",
            "visual",
            "数学经典",
            Some("📐"),
            Some("经典数学风格，清晰严谨"),
            "{\"colors\": {\"primary\": \"#58c4dd\", \"secondary\": \"#83c167\", \"bg\": \"#1c1c2e\"}}",
        ),
    ];

    for (id, preset_type, name, icon, description, config) in visual_presets {
        conn.execute(
            "INSERT INTO style_presets (id, type, name, icon, description, config) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            &[id, preset_type, name, icon.unwrap_or_default(), description.unwrap_or_default(), config],
        )?;
    }

    // Seed narration presets
    let narration_presets = vec![
        ("default-classroom", "narration", "课堂讲解 🎓", Some("专业严谨的课堂讲解风格"), r#"{"tone": "professional", "pace": "moderate"}"#),
        ("default-popular-science", "narration", "科普传播 📢", Some("通俗易懂的科普风格"), r#"{"tone": "friendly", "pace": "slow"}"#),
        ("default-academic", "narration", "学术报告 🎯", Some("正式严谨的学术报告"), r#"{"tone": "formal", "pace": "measured"}"#),
        ("default-fun-animation", "narration", "趣味动画 🎬", Some("轻松有趣的动画解说"), r#"{"tone": "playful", "pace": "fast"}"#),
        ("default-minimal-tech", "narration", "极简科技 🖥️", Some("简洁高效的科技风格"), r#"{"tone": "direct", "pace": "fast"}"#),
        ("default-storytelling", "narration", "故事叙述 📖", Some("娓娓道来的故事风格"), r#"{"tone": "narrative", "pace": "varied"}"#),
    ];

    for (id, preset_type, name, description, config) in narration_presets {
        conn.execute(
            "INSERT INTO style_presets (id, type, name, icon, description, config) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            &[id, preset_type, name, "", &description.unwrap_or_default(), config],
        )?;
    }

    // Seed default cases
    let cases = vec![
        ("default-case-1", "微积分导数入门", "什么是导数？从物理变化率到数学定义", "default-classroom", "default-deep-space", "请用课堂讲解的方式，解释导数的概念，从物理变化率引入", now),
        ("default-case-2", "量子力学基础", "波粒二象性：探索微观世界的奥秘", "default-popular-science", "default-math-classic", "用科普的方式讲解波粒二象性，让初学者也能理解", now),
        ("default-case-3", "线性代数应用", "矩阵变换在计算机图形学中的应用", "default-academic", "default-classic-minimal", "学术报告风格，讲解矩阵变换的数学原理和实际应用", now),
        ("default-case-4", "概率统计趣谈", "贝叶斯定理：从直觉到公式", "default-fun-animation", "default-vibrant-campus", "趣味动画讲解贝叶斯定理，用生活中的例子", now),
        ("default-case-5", "算法可视化", "快速排序算法的分治思想", "default-minimal-tech", "default-deep-space", "极简科技风，可视化展示快速排序的过程", now),
        ("default-case-6", "数学史话", "欧拉公式的发现之旅", "default-storytelling", "default-math-classic", "用故事叙述的方式，讲述欧拉如何发现这个美丽的公式", now),
        ("default-case-7", "物理概念解析", "相对论时间膨胀", "default-classroom", "default-deep-space", "课堂讲解风格，深入浅出解释时间膨胀原理", now),
        ("default-case-8", "化学动画演示", "原子轨道与电子云", "default-fun-animation", "default-vibrant-campus", "趣味动画展示原子轨道和电子云的分布", now),
    ];

    for (id, title, description, narration_style, visual_style, prompt, created_at) in cases {
        conn.execute(
            "INSERT INTO cases (id, title, description, narration_style, visual_style, prompt, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            &[id, title, description, narration_style, visual_style, prompt, &created_at.to_string()],
        )?;
    }

    Ok(())
}

// ==================== Tauri Commands ====================

#[tauri::command]
pub async fn init_db(app: AppHandle) -> Result<(), String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    init_tables(&conn).map_err(|e| e.to_string())?;
    seed_default_data(&conn).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    project: Project,
) -> Result<Project, String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO projects (id, title, description, narration_style, visual_style, status, script, video_path, duration, resolution, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        [
            &project.id,
            &project.title,
            project.description.as_ref().map(|s| s.as_str()).unwrap_or(""),
            project.narration_style.as_ref().map(|s| s.as_str()).unwrap_or(""),
            project.visual_style.as_ref().map(|s| s.as_str()).unwrap_or(""),
            &project.status,
            project.script.as_ref().map(|s| s.as_str()).unwrap_or(""),
            project.video_path.as_ref().map(|s| s.as_str()).unwrap_or(""),
            &project.duration.map(|d| d.to_string()).unwrap_or_default(),
            project.resolution.as_ref().map(|s| s.as_str()).unwrap_or(""),
            &project.created_at.to_string(),
            &project.updated_at.to_string(),
        ],
    ).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub async fn update_project(
    app: AppHandle,
    id: String,
    updates: Project,
) -> Result<(), String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE projects SET
            title = ?1,
            description = ?2,
            narration_style = ?3,
            visual_style = ?4,
            status = ?5,
            script = ?6,
            video_path = ?7,
            duration = ?8,
            resolution = ?9,
            updated_at = ?10
         WHERE id = ?11",
        [
            &updates.title,
            &updates.description.unwrap_or_default(),
            &updates.narration_style.unwrap_or_default(),
            &updates.visual_style.unwrap_or_default(),
            &updates.status,
            &updates.script.unwrap_or_default(),
            &updates.video_path.unwrap_or_default(),
            &updates.duration.map(|d| d.to_string()).unwrap_or_default(),
            &updates.resolution.unwrap_or_default(),
            &updates.updated_at.to_string(),
            &id,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_project(app: AppHandle, id: String) -> Result<Project, String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, narration_style, visual_style, status, script, video_path, duration, resolution, created_at, updated_at
             FROM projects WHERE id = ?1"
        )
        .map_err(|e| e.to_string())?;

    let project = stmt
        .query_row([&id], |row| {
            Ok(Project {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                narration_style: row.get(3)?,
                visual_style: row.get(4)?,
                status: row.get(5)?,
                script: row.get(6)?,
                video_path: row.get(7)?,
                duration: row.get(8)?,
                resolution: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub async fn list_projects(
    app: AppHandle,
    filter: Option<String>,
) -> Result<Vec<Project>, String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let query = if let Some(status_filter) = filter {
        format!(
            "SELECT id, title, description, narration_style, visual_style, status, script, video_path, duration, resolution, created_at, updated_at
             FROM projects WHERE status = '{}' ORDER BY updated_at DESC",
            status_filter
        )
    } else {
        "SELECT id, title, description, narration_style, visual_style, status, script, video_path, duration, resolution, created_at, updated_at
         FROM projects ORDER BY updated_at DESC".to_string()
    };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                narration_style: row.get(3)?,
                visual_style: row.get(4)?,
                status: row.get(5)?,
                script: row.get(6)?,
                video_path: row.get(7)?,
                duration: row.get(8)?,
                resolution: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(projects)
}

#[tauri::command]
pub async fn delete_project(app: AppHandle, id: String) -> Result<(), String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM projects WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn save_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
        [&key, &value],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_setting(
    app: AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT value FROM app_settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row([&key], |row| row.get::<_, String>(0))
        .ok();

    Ok(result)
}

#[tauri::command]
pub async fn get_style_presets(app: AppHandle) -> Result<Vec<StylePreset>, String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, type, name, icon, description, config FROM style_presets ORDER BY type, name"
        )
        .map_err(|e| e.to_string())?;

    let presets = stmt
        .query_map([], |row| {
            Ok(StylePreset {
                id: row.get(0)?,
                preset_type: row.get(1)?,
                name: row.get(2)?,
                icon: row.get(3)?,
                description: row.get(4)?,
                config: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(presets)
}

#[tauri::command]
pub async fn get_cases(app: AppHandle) -> Result<Vec<Case>, String> {
    let db_path = get_db_path(&app).map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, narration_style, visual_style, prompt, thumbnail_path, created_at
             FROM cases ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let cases = stmt
        .query_map([], |row| {
            Ok(Case {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                narration_style: row.get(3)?,
                visual_style: row.get(4)?,
                prompt: row.get(5)?,
                thumbnail_path: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(cases)
}
