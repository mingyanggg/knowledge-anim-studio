# Manim Studio Integration - Refactor Plan

## Goal
Replace the current "DeepSeek generates Python code → run manim" architecture with a stable "DeepSeek generates YAML → Manim Studio engine renders" architecture.

## Reference
- Manim Studio repo is cloned at `/tmp/simulationapi`
- Study its YAML format, scene_builder.py, types.py, and configs/ examples
- We need to adapt it for our project, NOT just copy-paste

## What to do

### Step 1: Integrate Manim Studio engine
- Copy the core engine (`src/core/`, `src/scenes/`, `src/components/`, `main.py`) into `knowledge-anim-studio/manim-engine/`
- Create a thin Python wrapper `manim-engine/render.py` that:
  - Takes a YAML string as input
  - Validates it
  - Renders to MP4 using Manim Studio's scene builder
  - Returns the output MP4 path
  - Has proper error handling (syntax errors, validation errors, render errors)

### Step 2: Modify backend DeepSeek prompt
In `backend/src/index.js`, change the system prompt so DeepSeek outputs YAML/JSON instead of Python code:
- New system prompt should describe Manim Studio's YAML format (objects, animations, scene config)
- Provide examples of valid YAML configurations
- The output should be a clean YAML string (no markdown fencing, no extra text)
- Change `callAI` function to extract YAML instead of Python code

### Step 3: Modify Rust render command
In `src-tauri/src/manim.rs`, change `render_animation` to:
- Accept a `script` parameter that's now YAML format
- Write it as `temp_scene.yaml` instead of `temp_scene.py`
- Call the new `manim-engine/render.py` wrapper instead of running `manim render` directly
- Keep the same output path structure and return format

### Step 4: Test end-to-end
- Make sure the backend generates valid YAML
- Make sure the Rust side renders it correctly
- Verify the video plays in the app

## Constraints
- Keep all existing UI/features working (video player, export, history, etc.)
- Keep the subscription/quota system as-is
- The YAML format must match what Manim Studio's scene builder expects
- Use existing `MANIM_PYTHON` path: `/Users/michael/.manim-venv/bin/python3`
- Use existing output dir: `/Users/michael/.knowledge-anim-output`
- Manim Studio requires Python dependencies - check requirements.txt and install what's missing into the manim venv
- This is a Tauri 2 app - keep all Tauri APIs working
- Keep the asset protocol config we just added in tauri.conf.json

## Important
- Read the Manim Studio source code thoroughly before making changes
- The YAML format in types.py and config.py is the source of truth
- Make sure to install any missing Python dependencies for Manim Studio into `/Users/michael/.manim-venv/`
- Test rendering manually with at least one YAML config before calling it done
