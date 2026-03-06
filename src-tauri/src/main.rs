// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

fn build_menu() -> Menu {
    // -- App menu (macOS only, ignored on Windows) --
    let app_menu = Submenu::new(
        "SteamBBEditor",
        Menu::new()
            .add_native_item(MenuItem::About(
                "SteamBBEditor".to_string(),
                Default::default(),
            ))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Quit),
    );

    // -- File menu --
    let file_menu = Submenu::new(
        "File",
        Menu::new()
            .add_item(CustomMenuItem::new("new", "New").accelerator("CmdOrCtrl+N"))
            .add_item(CustomMenuItem::new("open", "Open...").accelerator("CmdOrCtrl+O"))
            .add_item(CustomMenuItem::new("save-as", "Save As...").accelerator("CmdOrCtrl+S"))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::CloseWindow),
    );

    // -- Edit menu (native items work with text fields automatically) --
    let edit_menu = Submenu::new(
        "Edit",
        Menu::new()
            .add_native_item(MenuItem::Undo)
            .add_native_item(MenuItem::Redo)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::SelectAll),
    );

    // -- View menu --
    let view_menu = Submenu::new(
        "View",
        Menu::new()
            .add_item(
                CustomMenuItem::new("toggle-tags", "Toggle Tags Reference")
                    .accelerator("CmdOrCtrl+T"),
            )
            .add_item(
                CustomMenuItem::new("toggle-settings", "Toggle Settings")
                    .accelerator("CmdOrCtrl+,"),
            ),
    );

    // -- Window menu --
    let window_menu = Submenu::new(
        "Window",
        Menu::new()
            .add_native_item(MenuItem::Minimize)
            .add_native_item(MenuItem::Zoom)
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("bring-all-to-front", "Bring All to Front")),
    );

    // -- Help menu --
    let help_menu = Submenu::new(
        "Help",
        Menu::new().add_item(CustomMenuItem::new("help", "SteamBBEditor Help")),
    );

    Menu::new()
        .add_submenu(app_menu)
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(window_menu)
        .add_submenu(help_menu)
}

fn main() {
    tauri::Builder::default()
        .menu(build_menu())
        .on_menu_event(|event| {
            let id = event.menu_item_id();
            // Emit all custom menu events to the frontend for handling
            let _ = event.window().emit("menu-event", id);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
