Purpose

This project contains a set of single-file Python scripts that simulate and animate a crank-rod (biela-manivela) mechanism using numpy + matplotlib. These instructions give an AI coding agent the direct, actionable knowledge needed to make safe edits, implement features, and run the code locally.

Big picture

- Repository shape: a few standalone scripts in the workspace root: `Manivela_1.py`, `Manivela_2.py`, `Manivela_3.py`, `MANIVELA CORREDERA.py`, `MANIVELA_CORREDERA_CORREGIDO.py`.
- Purpose: compute kinematic quantities (piston position xB, velocity Vb, acceleration Ab, biela angle phi) for a crank-rod mechanism and display analysis plots and interactive animations (matplotlib.FuncAnimation).
- Structural decision: scripts are written as single-run programs (not a package). They configure plotting (rcParams) and then call `plt.show()`; they are intended to be executed directly, not imported as modules.

Key files and patterns to inspect

- `Manivela_1.py`, `Manivela_2.py`, `Manivela_3.py` — variations of the same simulation/visualization. Use them as canonical examples of the calculation pipeline: parameters -> trig arrays -> xB/Vb/Ab/phi -> plots/animation.
- `MANIVELA_CORREDERA_CORREGIDO.py` — appears to be a corrected / improved version; prefer referencing it for robust formulas (it uses guards like np.maximum to avoid sqrt domain errors).

Conventions and idioms

- Variable names and comments are in Spanish. Common names: `r2` (manivela), `r3` (biela), `w2` (omega), `alpha2`, `lambda_ratio` or `ratio_r_l`, `theta_deg`, `theta_rad`, `xB`, `Vb`, `Ab`, `phi_deg`.
- Units: lengths in meters (comments) but many printed/plot values convert to mm (multiplication by 1000) — preserve these conversions when editing display code.
- Visualization: all scripts set a plotting style at top (e.g., `plt.style.use('seaborn-v0_8-darkgrid')`) and modify `plt.rcParams`. Keep these global settings together when changing visuals.
- Numeric robustness: some files include defensive patterns (np.maximum, safe sqrt) to avoid NaNs for near-singular geometries. Prefer the guarded approach used in `MANIVELA_CORREDERA_CORREGIDO.py` when changing formulas.

How to run locally (Windows PowerShell)

- Ensure dependencies are installed: numpy, matplotlib.
  Example (PowerShell):
  python -m pip install --user numpy matplotlib
- Run a script:
  python "c:\Users\User\OneDrive\Documents\ARCHIVOS PYTHON\REFUERZO CONCEPTOS\DINAMICA\Manivela_2.py"
- Quick syntax check before running:
  python -m py_compile "<path-to-file>.py"

Typical edits an agent might do (and how to do them safely)

- Change mechanism geometry or speed: edit top-of-file constants (`r2`, `r3`, `w2`) — these are the canonical input parameters.
- Increase animation resolution / frames: update `n_frames` or the theta array creation (`np.linspace`) — keep consistent sizes across dependent arrays (position/velocity/accel arrays). Many scripts use `n_frames = 360` or `theta_deg = np.linspace(0,360,n_frames)`.
- Replace a fragile sqrt-based expression: prefer the guarded pattern in `MANIVELA_CORREDERA_CORREGIDO.py` that computes d = max(eps, r3**2 - (r2*sin(theta))**2) and uses np.sqrt(d) to avoid NaNs.
- When changing plotting layout, preserve the `init()` and `animate()` functions and the call to `FuncAnimation(..., blit=True)`; modifying return tuples there must keep the same number of artists.

Integration points & external dependencies

- Third-party libs: numpy, matplotlib. There are no network calls or external APIs.
- Files are independent scripts — changes in one script do not automatically propagate to others. If adding a new utility function, prefer creating a small helper module (e.g., `manivela_utils.py`) and update scripts to import it — but only do this when adding tests or CI to prevent regressions.

Tests, debugging and quick checks

- No existing unit tests in the repo. Minimal checks:
  - Run `python -m py_compile <file>` to catch syntax errors.
  - Execute the script and confirm a Matplotlib window opens without exceptions.
  - For numerical issues, print min/max of `xB`, `Vb`, `Ab` and check for NaNs.

Behavioral rules for the AI agent

- Preserve top-of-file parameter blocks and Spanish documentation comments when editing. They are the canonical user-facing configuration.
- Prefer non-breaking, minimal edits: fix small numeric robustness issues, add docstring comments, or add a short helper module rather than large refactors.
- If adding or renaming files, update the README (none currently) and include a one-line usage example.

Examples (explicit)

- To test a geometry change, modify `r2` in `Manivela_2.py` and run the script; expect printed summary lines (carrera, velocidad maxima, aceleracion maxima).
- To harden the sqrt usage, adopt the pattern from `MANIVELA_CORREDERA_CORREGIDO.py`:
  d = np.maximum(1e-10, r3**2 - (r2 * np.sin(theta_rad))**2)
  sqrt_d = np.sqrt(d)

If anything here is unclear or you want more detail (examples for refactoring into modules, unit test suggestions, or a small CI job to run syntax checks), tell me which part to expand and I will iterate.
