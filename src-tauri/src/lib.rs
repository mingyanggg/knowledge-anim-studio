// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod ai;
mod manim;
mod subscription;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database on app startup
            tauri::async_runtime::block_on(async {
                if let Err(e) = db::init_db(app.handle().clone()).await {
                    eprintln!("Failed to initialize database: {}", e);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // AI 生成命令
            ai::generate_animation_script,
            ai::export_script_file,
            // Manim commands
            manim::check_manim_installed,
            manim::generate_script,
            manim::render_animation,
            manim::render_with_audio,
            manim::export_gif,
            manim::export_to_path,
            // Subscription commands
            subscription::check_subscription,
            subscription::activate_code,
            subscription::deactivate_subscription,
            // Database commands
            db::init_db,
            db::create_project,
            db::update_project,
            db::get_project,
            db::list_projects,
            db::delete_project,
            db::save_setting,
            db::get_setting,
            db::get_style_presets,
            db::get_cases,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
