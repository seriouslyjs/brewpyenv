# JJN-INFO: BREWPYENV  

## So, What Did You Build?  
This is your **"get rid of Homebrew Python without breaking your system"** tool.  

You must have been **sick of Brew managing Python**, so you threw together `brewpyenv`, which scans for Python installations from Homebrew, **rips them out**, and **replaces them with `pyenv`** while keeping everything working.   

A noble cause. Python versioning under Homebrew was a mess anyway.  

---

## How It Works (For Future Jason Who Will Forget This)  

### Step 1: Detect Homebrew-Managed Python  
- Finds installed Python versions using:  
  ```bash
  brew list | grep 'python@'
  ```
- Identifies dependencies that rely on Brew's Python.  

### Step 2: Replace Brew Python with `pyenv`  
- Installs **matching versions** using `pyenv`:  
  ```bash
  pyenv install X.Y.Z
  ```
- **Creates symlinks** so things don’t break.  

### Step 3: Reinstall Packages in the New Python Environment  
- Migrates packages **to the `pyenv` version**.  
- Updates `$PATH` and **modifies `.zshrc`** to prioritize `pyenv`.  

### Step 4: Remove Old Homebrew Python  
- Deletes outdated Brew-managed versions **without breaking dependencies**.  

---

## Git & Repo Info (So You Don't Have to Look It Up)  
- **Repo:** [Belish](https://github.com/jasonnathan/Belish)  
- **Remote Origin:**  
  - Fetch: `https://github.com/jasonnathan/Belish.git`  
  - Push: `https://github.com/jasonnathan/Belish.git`  

---

## Project Structure (So You Don’t Get Lost)  
```
.
├── LICENSE                 # You were probably too lazy to pick a real license
├── README.md               # Placeholder (likely empty or vague)
├── bun.lockb               # Bun lockfile (because you're a speed demon)
├── index.mjs               # Main entry point (where the magic happens)
├── jsconfig.json           # IDE configuration (VSCode settings, maybe?)
├── package.json            # Dependencies and metadata
├── pyenv_migration.log     # Log file for migration process
├── util.mjs                # Core logic for migration
└── util.test.mjs           # Tests for `util.mjs` (yes, you actually wrote tests)
```

### Key Files  
- **`index.mjs`**  
  - Orchestrates everything (detect, replace, reinstall, clean up).  
  - Probably has some *questionable* hardcoded paths.  
  - Needs more comments for **Future Jason’s sanity**.  

- **`util.mjs`**  
  - Handles actual migration logic.  
  - Uses `winston` for logging (`pyenv_migration.log`).  
  - Checks and installs required `pyenv` versions.  
  - Generates symlinks so existing packages don’t break.  

- **`util.test.mjs`**  
  - Contains **actual tests**. Good job.  
  - Uses **Bun’s test runner** (fast as hell).  

---

## Usage (Because You WILL Forget This)  

### 1. Install Dependencies  
```bash
bun install
```
or  
```bash
npm install
```

### 2. Run the Migration  
```bash
node index.mjs
```
*(This will scan, replace, and update everything.)*  

### 3. Run Tests  
```bash
node util.test.mjs
```

---

## What Works vs. What’s a Mess  

### ✅ **Stuff That Works**  
- **Automatically detects and replaces Brew Python with `pyenv`**.  
- **Creates symlinks to prevent dependency breakage**.  
- **Logs everything in `pyenv_migration.log`**, which is smart.  

### 🔧 **Stuff That Needs Work**  
1. **Error Handling is Weak**  
   - What if `pyenv install` fails?  
   - What if Brew refuses to uninstall Python?  
   - What if you somehow brick your `$PATH`?  

2. **No Dry Run Mode**  
   - Would be nice to preview changes before running.  

3. **Refactor `index.mjs`**  
   - Break it into smaller, more maintainable functions.  

4. **Package This as a CLI Tool**  
   - Why not? A global `brewpyenv` command would be neat.  

---

## Final Thoughts  
This script **saves a ton of manual work**, but it could use some polish.  

**If you’re ever debugging this again, just remember:**  
- **Your Homebrew setup is GONE after running this.**  
- **Check `.zshrc` to make sure `pyenv` is actually being used.**  
- **If something breaks, start by checking symlinks.**  

🚀 **Now go make it bulletproof.**