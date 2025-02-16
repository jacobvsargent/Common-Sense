import pandas as pd
import random
import tkinter as tk
from tkinter import Label, Button, StringVar, OptionMenu

def load_cards_from_excel(filename):
    df = pd.read_excel(filename)
    df.columns = ['text', 'deck', 'count']
    category, modifier, object_ = [], [], []
    
    for _, row in df.iterrows():
        text, deck, count = row['text'], row['deck'], row['count']
        if pd.notna(text) and pd.notna(deck) and pd.notna(count):
            count = int(count)
            if "Category" in deck:
                category.extend([text] * count)
            elif "Modifier" in deck:
                modifier.extend([text] * count)
            elif "Object" in deck:
                object_.extend([text] * count)
    
    return category, modifier, object_

def draw_cards():
    if category and modifier and object_:
        result_label.config(text=f"{random.choice(category)} {random.choice(modifier)} {random.choice(object_)}")
        reset_players()

def exit_app():
    root.destroy()

def create_player_window(player_name):
    player_window = tk.Toplevel(root)
    player_window.title(player_name)
    player_window.geometry("300x400")
    
    attributes = {
        "Color": ["", "Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black", "White", "Pink", "Brown"],
        "Texture": ["", "Bumpy", "Sharp", "Sticky", "Smooth", "Slippery", "Squishy", "Firm", "Fluffy"],
        "Taste": ["", "Bitter", "Sour", "Salty", "Savory", "Sweet", "Spicy"],
        "Smell": ["", "Natural", "Neutral", "Pungent", "Chemical"],
        "Volume": ["", "Loud", "Quiet"]
    }
    
    vars_dict = {}
    
    lock_button = Button(player_window, text="Lock In", command=lambda: toggle_lock(lock_button, player_window), bg="lightgrey")
    lock_button.pack(pady=5)
    
    clear_button = Button(player_window, text="Clear", command=lambda: clear_selections(vars_dict, attributes), bg="lightgrey")
    clear_button.pack(pady=5)
    
    for idx, (label, options) in enumerate(attributes.items()):
        tk.Label(player_window, text=label, font=("Arial", 10)).pack()
        var = StringVar(value=options[0])
        vars_dict[label] = var
        dropdown = OptionMenu(player_window, var, *options)
        dropdown.pack()
        vars_dict[label + "_widget"] = dropdown
    
    player_data[player_name] = {"vars": vars_dict, "locked": False, "window": player_window, "lock_button": lock_button}

def clear_selections(vars_dict, attributes):
    for label, var in vars_dict.items():
        if not label.endswith("_widget"):
            var.set(attributes[label][0])

def toggle_lock(button, window):
    player = [p for p in player_data if player_data[p]["window"] == window][0]
    player_data[player]["locked"] = not player_data[player]["locked"]
    if player_data[player]["locked"]:
        for widget in window.winfo_children():
            if isinstance(widget, OptionMenu) or isinstance(widget, Label):
                widget.pack_forget()
        button.config(text="Locked In!")
    else:
        for widget in window.winfo_children():
            widget.pack()
        button.config(text="Lock In")
    check_button.config(state="normal" if all(p["locked"] for p in player_data.values()) else "disabled")

def check_match():
    global correct_guesses, incorrect_guesses
    p1_choices = [player_data["Player 1"]["vars"][attr].get() for attr in player_data["Player 1"]["vars"] if not attr.endswith("_widget")]
    p2_choices = [player_data["Player 2"]["vars"][attr].get() for attr in player_data["Player 2"]["vars"] if not attr.endswith("_widget")]
    
    if p1_choices == p2_choices:
        result_label.config(text="Now that's some Common Sense!")
        correct_guesses += 1
    else:
        result_label.config(text="Uh-oh, that's non-sensical!")
        incorrect_guesses += 1
    
    correct_label.config(text=f"Correct: {correct_guesses}")
    incorrect_label.config(text=f"Incorrect: {incorrect_guesses}")
    
    for attr, (p1, p2) in zip(player_data["Player 1"]["vars"].keys(), zip(p1_choices, p2_choices)):
        if not attr.endswith("_widget"):
            color = "lightgreen" if p1 == p2 and p1 != "" else "lightcoral"
            player_data["Player 1"]["vars"][attr + "_widget"].config(bg=color)
            player_data["Player 2"]["vars"][attr + "_widget"].config(bg=color)

def reset_players():
    for player in player_data.values():
        clear_selections(player["vars"], {
            "Color": ["", "Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black", "White", "Pink", "Brown"],
            "Texture": ["", "Bumpy", "Sharp", "Sticky", "Smooth", "Slippery", "Squishy", "Firm", "Fluffy"],
            "Taste": ["", "Bitter", "Sour", "Salty", "Savory", "Sweet", "Spicy"],
            "Smell": ["", "Natural", "Neutral", "Pungent", "Chemical"],
            "Volume": ["", "Loud", "Quiet"]
        })
        player["locked"] = False
        player["lock_button"].config(text="Lock In")
        check_button.config(state="disabled")

correct_guesses = 0
incorrect_guesses = 0
filename = "common_sense.xlsx"
category, modifier, object_ = load_cards_from_excel(filename)

root = tk.Tk()
root.title("Card Drawer")
root.geometry("400x350")

Label(root, text="Press the button to draw a card!", font=("Arial", 14)).pack(pady=10)
result_label = Label(root, text="", font=("Arial", 12), wraplength=350)
result_label.pack(pady=20)
correct_label = Label(root, text="Correct: 0", font=("Arial", 12))
correct_label.pack()
incorrect_label = Label(root, text="Incorrect: 0", font=("Arial", 12))
incorrect_label.pack()
Button(root, text="Draw Cards", command=draw_cards, font=("Arial", 12), bg="lightblue").pack(pady=5)
Button(root, text="Exit", command=exit_app, font=("Arial", 12), bg="lightcoral").pack(pady=5)
check_button = Button(root, text="Check!", command=check_match, font=("Arial", 12), bg="lightgreen", state="disabled")
check_button.pack(pady=5)

player_data = {}
create_player_window("Player 1")
create_player_window("Player 2")

root.mainloop()
