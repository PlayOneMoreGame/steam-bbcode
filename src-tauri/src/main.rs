// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;

/// Read a file from disk and emit its content to the frontend.
/// Called when the app is launched with a file argument or receives a file-open event.
fn open_file_and_emit(app: &tauri::AppHandle, path: &str) {
    if let Ok(content) = std::fs::read_to_string(path) {
        // Extract filename from path
        let filename = std::path::Path::new(path)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(path)
            .to_string();

        #[derive(Clone, serde::Serialize)]
        struct FileOpenPayload {
            filename: String,
            content: String,
            path: String,
        }

        if let Some(window) = app.get_webview_window("main") {
            let _ = window.emit(
                "file-open",
                FileOpenPayload {
                    filename,
                    content,
                    path: path.to_string(),
                },
            );
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Check if the app was launched with a file argument
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = &args[1];
                let path = std::path::Path::new(file_path);
                if path.exists() && path.is_file() {
                    let handle = app.handle().clone();
                    let file_path = file_path.clone();
                    // Emit after the window is ready
                    std::thread::spawn(move || {
                        // Small delay to ensure the frontend is loaded
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        open_file_and_emit(&handle, &file_path);
                    });
                }
            }
            // -- App menu (macOS only, ignored on Windows) --
            let app_menu = SubmenuBuilder::new(app, "SteamBBEditor")
                .about(None)
                .separator()
                .quit()
                .build()?;

            // -- File menu --
            let new_item = MenuItemBuilder::with_id("new", "New")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let open_item = MenuItemBuilder::with_id("open", "Open...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let save_as_item = MenuItemBuilder::with_id("save-as", "Save As...")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;
            let close_window = PredefinedMenuItem::close_window(app, None)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_item)
                .item(&open_item)
                .item(&save_as_item)
                .separator()
                .item(&close_window)
                .build()?;

            // -- Edit menu (native items work with text fields automatically) --
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // -- View menu --
            let toggle_tags = MenuItemBuilder::with_id("toggle-tags", "Toggle Tags Reference")
                .accelerator("CmdOrCtrl+T")
                .build(app)?;
            let toggle_settings = MenuItemBuilder::with_id("toggle-settings", "Toggle Settings")
                .accelerator("CmdOrCtrl+,")
                .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_tags)
                .item(&toggle_settings)
                .build()?;

            // -- Window menu --
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .maximize()
                .build()?;

            // -- Help menu --
            let help_item = MenuItemBuilder::with_id("help", "SteamBBEditor Help")
                .build(app)?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&help_item)
                .build()?;

            // Build the complete menu bar
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "help" => {
                    // shell::open is deprecated in favor of tauri-plugin-opener,
                    // but opener is not yet installed — tracked for a future update
                    #[allow(deprecated)]
                    let _ = app
                        .shell()
                        .open("https://github.com/PlayOneMoreGame/steam-bbcode", None);
                }
                _ => {
                    // Forward all other custom menu events to the frontend
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", id);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
