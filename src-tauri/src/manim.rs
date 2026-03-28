use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Command, Stdio};

const MANIM_PYTHON: &str = "/Users/michael/.manim-venv/bin/python3";
const MANIM_OUTPUT_DIR: &str = "/Users/michael/.knowledge-anim-output";
const RENDER_TIMEOUT_SECS: u64 = 120;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManimStatus {
    pub installed: bool,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerateParams {
    pub description: String,
    pub template_id: Option<String>,
    pub params: RenderParams,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderParams {
    pub primary_color: String,
    pub secondary_color: String,
    pub style: String,
    pub duration: u32,
    pub fps: u32,
    pub resolution: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenderResult {
    pub success: bool,
    pub output_path: String,
    pub format: String,
    pub duration_secs: f64,
    pub log: String,
}

#[tauri::command]
pub async fn check_manim_installed() -> Result<ManimStatus, String> {
    let output = Command::new(MANIM_PYTHON)
        .args(["-c", "import manim; print(manim.__version__)"])
        .output()
        .map_err(|e| format!("Failed to run Python: {}", e))?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(ManimStatus { installed: true, version: Some(version) })
    } else {
        Ok(ManimStatus { installed: false, version: None })
    }
}

#[tauri::command]
pub async fn generate_script(params: GenerateParams) -> Result<String, String> {
    let scene_name = "GeneratedScene";
    let primary = &params.params.primary_color;
    let secondary = &params.params.secondary_color;
    let desc = &params.description;
    let title = if desc.is_empty() { "Knowledge Animation".to_string() } else { desc.chars().take(40).collect::<String>() };

    let script = format!(
        r#"from manim import *

class {scene_name}(Scene):
    def construct(self):
        title = Text("{title}", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)
        axes = Axes(x_range=[-5, 5, 1], y_range=[-3, 3, 1], axis_config={{"color": "{primary}"}})
        graph = axes.plot(lambda x: x ** 2, color="{secondary}")
        graph_label = axes.get_graph_label(graph, label="f(x) = x²")
        self.play(Create(axes), run_time=1.5)
        self.play(Create(graph), run_time=1.5)
        self.play(Write(graph_label), run_time=0.5)
        dot = Dot(color="{primary}")
        dot.move_to(axes.c2p(0, 0))
        self.play(FadeIn(dot))
        moving_dot = dot.copy()
        self.play(MoveAlongPath(moving_dot, graph), run_time={duration}, rate_func=smooth)
        self.play(FadeOut(moving_dot))
        area = axes.get_area(graph, x_range=[-2, 2], color="{primary}", opacity=0.3)
        self.play(FadeIn(area))
        self.wait(0.5)
        self.play(FadeOut(area))
        self.play(FadeOut(graph), FadeOut(graph_label), FadeOut(axes))
        conclusion = Text("Knowledge Animation", font_size=36, color="{secondary}")
        conclusion.move_to(ORIGIN)
        self.play(Write(conclusion))
        self.wait(1)
        self.play(FadeOut(conclusion))
"#,
        scene_name = scene_name,
        title = title,
        primary = primary,
        secondary = secondary,
        duration = params.params.duration,
    );

    Ok(script)
}

#[tauri::command]
pub async fn render_animation(script: String) -> Result<RenderResult, String> {
    std::fs::create_dir_all(MANIM_OUTPUT_DIR)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    // Extract scene name from YAML or use default
    let scene_name = extract_scene_name_from_yaml(&script).unwrap_or_else(|_| "KnowledgeAnimation".to_string());

    // Write YAML to temp file
    let yaml_path = PathBuf::from(MANIM_OUTPUT_DIR).join("temp_scene.yaml");
    std::fs::write(&yaml_path, &script)
        .map_err(|e| format!("Failed to write YAML: {}", e))?;

    let start = std::time::Instant::now();

    // Path to the render wrapper (manim-engine/ is in project root, CARGO_MANIFEST_DIR is src-tauri/)
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
        .unwrap_or_else(|_| ".".to_string());
    let project_root = PathBuf::from(&manifest_dir).parent()
        .map(|p| PathBuf::from(p))
        .unwrap_or_else(|| PathBuf::from(&manifest_dir));
    let render_wrapper = project_root.join("manim-engine").join("render.py");

    let child = Command::new(MANIM_PYTHON)
        .args([
            render_wrapper.to_str().unwrap(),
            yaml_path.to_str().unwrap(),
            "-o", &format!("{}/videos/{}.mp4", MANIM_OUTPUT_DIR, scene_name),
            "-q", "m",  // Medium quality (720p30) for better output quality
        ])
        .env("PYTHONIOENCODING", "utf-8")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            eprintln!("[render_animation] Failed to spawn render wrapper: {}", e);
            format!("Failed to run render wrapper: {}", e)
        })?;

    // Use wait_with_output but check elapsed time
    let output = match child.wait_with_output() {
        Ok(output) => output,
        Err(e) => return Err(format!("Failed to wait for Manim process: {}", e)),
    };

    let elapsed = start.elapsed();

    if elapsed.as_secs() > RENDER_TIMEOUT_SECS {
        eprintln!("[render_animation] Render timed out after {}s", elapsed.as_secs());
        return Err(format!("Manim render timed out after {} seconds.", elapsed.as_secs()));
    }

    let elapsed_f64 = elapsed.as_secs_f64();

    let stderr_log = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout_log = String::from_utf8_lossy(&output.stdout).to_string();
    eprintln!("[render_animation] success={}, stdout_len={}, stderr_len={}", output.status.success(), stdout_log.len(), stderr_log.len());

    if !output.status.success() {
        // Log last 500 chars of stderr for debugging
        eprintln!("[render_animation] stderr: {}", &stderr_log[..stderr_log.len().min(500)]);
        return Err(format!("Render failed.\nStdout:\n{}\nStderr:\n{}", stdout_log, stderr_log));
    }

    // The render wrapper returns the output path in stdout as JSON
    // The JSON may be multi-line, so try parsing the full stdout first, then last non-empty line
    let mp4_path = if let Ok(result) = serde_json::from_str::<serde_json::Value>(&stdout_log.trim()) {
        if let Some(path) = result.get("output_path").and_then(|p| p.as_str()) {
            PathBuf::from(path)
        } else {
            PathBuf::from(MANIM_OUTPUT_DIR)
                .join(format!("{}.mp4", scene_name))
        }
    } else if let Some(line) = stdout_log.lines().rev().find(|l| !l.trim().is_empty()) {
        // Try to parse JSON output from render wrapper
        if let Ok(result) = serde_json::from_str::<serde_json::Value>(&line) {
            if let Some(path) = result.get("output_path").and_then(|p| p.as_str()) {
                PathBuf::from(path)
            } else {
                // Fallback to expected path
                PathBuf::from(MANIM_OUTPUT_DIR)
                    .join(format!("{}.mp4", scene_name))
            }
        } else {
            // Fallback to expected path
            PathBuf::from(MANIM_OUTPUT_DIR)
                .join(format!("{}.mp4", scene_name))
        }
    } else {
        // Fallback to expected path
        PathBuf::from(MANIM_OUTPUT_DIR)
            .join(format!("{}.mp4", scene_name))
    };

    let log = format!("{}\n{}", stdout_log, stderr_log);

    if mp4_path.exists() {
        eprintln!("[render_animation] found at: {}", mp4_path.display());
        Ok(RenderResult {
            success: true,
            output_path: mp4_path.to_string_lossy().to_string(),
            format: "mp4".to_string(),
            duration_secs: elapsed_f64,
            log,
        })
    } else {
        eprintln!("[render_animation] expected at: {}, not found", mp4_path.display());
        Err(format!("Render succeeded but output file not found at expected path: {}", mp4_path.display()))
    }
}

fn extract_scene_name_from_yaml(yaml: &str) -> Result<String, String> {
    // Extract scene name from YAML
    // Look for "name:" under "scene:"
    for line in yaml.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("name:") && !trimmed.starts_with("#") {
            // Extract the name value
            if let Some(name_part) = trimmed.split(':').nth(1) {
                let name = name_part.trim()
                    .trim_start_matches('"')
                    .trim_start_matches('\'')
                    .trim_end_matches('"')
                    .trim_end_matches('\'')
                    .to_string();
                if !name.is_empty() {
                    return Ok(name);
                }
            }
        }
    }
    Err("No scene name found in YAML".to_string())
}

/// Export a video file to GIF using ffmpeg (convert existing MP4 → GIF)
#[tauri::command]
pub async fn export_gif(video_path: String) -> Result<String, String> {
    let input = PathBuf::from(&video_path);
    if !input.exists() {
        return Err(format!("Video file not found: {}", video_path));
    }

    let gif_path = input.with_extension("gif");

    // Use ffmpeg to convert MP4 to GIF with reasonable quality
    let output = Command::new("ffmpeg")
        .args([
            "-y",
            "-i", &video_path,
            "-vf", "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
            "-loop", "0",
            gif_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("ffmpeg not found or failed to run: {}", e))?;

    if output.status.success() && gif_path.exists() {
        Ok(gif_path.to_string_lossy().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("GIF export failed: {}", stderr))
    }
}

#[tauri::command]
pub async fn export_to_path(source_path: String, dest_path: String) -> Result<String, String> {
    std::fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy file: {}", e))?;
    Ok(dest_path)
}

/// Extract narration text from YAML scene objects (type "text")
fn extract_narration_from_yaml(yaml: &str) -> String {
    let mut texts = Vec::new();
    let mut in_objects = false;

    for line in yaml.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("objects:") {
            in_objects = true;
            continue;
        }
        if in_objects {
            if trimmed.starts_with("- name:") || trimmed.starts_with("animations:") {
                break;
            }
            if trimmed.starts_with("text:") {
                let text_val = trimmed.trim_start_matches("text:").trim().trim_matches('"').trim_matches('\'');
                if !text_val.is_empty() && !text_val.contains("{") {
                    texts.push(text_val.to_string());
                }
            }
        }
    }

    texts.join("。")
}

/// Render animation with TTS narration
#[tauri::command]
pub async fn render_with_audio(
    script: String,
    narration_style: String,
) -> Result<RenderResult, String> {
    use std::time::Instant;
    let start = Instant::now();

    // Step 1: Render the video (reuse existing logic)
    let video_result = render_animation(script.clone()).await?;
    let video_path = PathBuf::from(&video_result.output_path);

    // Step 2: Extract narration text and generate TTS
    let narration_text = extract_narration_from_yaml(&script);
    if narration_text.is_empty() {
        eprintln!("[render_with_audio] No text found for narration, returning video as-is");
        return Ok(video_result);
    }

    eprintln!("[render_with_audio] Narration text ({} chars), style={}", narration_text.len(), narration_style);

    let tts_script = PathBuf::from(MANIM_OUTPUT_DIR).parent()
        .unwrap_or(&PathBuf::from("."))
        .join("manim-engine")
        .join("tts.py");

    let audio_path = PathBuf::from(MANIM_OUTPUT_DIR).join("narration.mp3");
    let merged_path = PathBuf::from(MANIM_OUTPUT_DIR).join("final_with_audio.mp4");

    let child = Command::new(MANIM_PYTHON)
        .args([
            tts_script.to_str().unwrap(),
            &narration_text,
            "-o", audio_path.to_str().unwrap(),
            "-s", &narration_style,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn TTS: {}", e))?;

    let output = child.wait_with_output()
        .map_err(|e| format!("TTS process failed: {}", e))?;

    let stderr_log = String::from_utf8_lossy(&output.stderr).to_string();
    eprintln!("[render_with_audio] TTS stderr: {}", &stderr_log[..stderr_log.len().min(300)]);

    if !output.status.success() || !audio_path.exists() {
        eprintln!("[render_with_audio] TTS failed, returning video without audio");
        return Ok(video_result);
    }

    // Step 3: Merge audio with video using a proper Python script invocation (not f-string in -c)
    let merge_script = tts_script.clone();
    let child = Command::new(MANIM_PYTHON)
        .args([
            "-c",
            "import sys,json,os; sys.path.insert(0,os.path.dirname(sys.argv[1])); from tts import merge_audio_with_video; r=merge_audio_with_video(sys.argv[2],sys.argv[3],sys.argv[4]); print(json.dumps(r,ensure_ascii=False))",
            "--", merge_script.to_str().unwrap(),
            video_path.to_str().unwrap(),
            audio_path.to_str().unwrap(),
            merged_path.to_str().unwrap(),
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn merge: {}", e))?;

    let output = child.wait_with_output()
        .map_err(|e| format!("Merge process failed: {}", e))?;

    if !output.status.success() {
        eprintln!("[render_with_audio] Merge failed, returning video without audio");
        return Ok(video_result);
    }

    let elapsed = start.elapsed().as_secs_f64();

    if merged_path.exists() {
        eprintln!("[render_with_audio] Final video with audio: {}", merged_path.display());
        Ok(RenderResult {
            success: true,
            output_path: merged_path.to_string_lossy().to_string(),
            format: "mp4".to_string(),
            duration_secs: elapsed,
            log: video_result.log.clone() + "\n[Audio narration added]",
        })
    } else {
        eprintln!("[render_with_audio] Merged file not found, returning original video");
        Ok(video_result)
    }
}
