// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod manim;
mod subscription;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Manim commands
            manim::check_manim_installed,
            manim::generate_script,
            manim::render_animation,
            manim::export_gif,
            manim::export_mp4,
            // Subscription commands
            subscription::check_subscription,
            subscription::activate_code,
            subscription::deactivate_subscription,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
