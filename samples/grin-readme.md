# GRIN — General Recognition Inference Network

Fast, amortized, uncertainty-calibrated inference of General Recognition Theory (GRT)
perceptual representations from a 2×2 identification confusion matrix. A neural network,
trained once on simulated data, replaces per-participant maximum-likelihood fitting:
milliseconds instead of seconds, with a calibrated approximate posterior and a
model-class inference, fast enough to run inside the trial loop for adaptive testing.

- **What the numbers mean:** `docs/interpreting.md`
- **The maths (parameterisation, constraints, prior):** `docs/GRT_model_spec.md`
- **What each validation check establishes:** `validation/README_validation.md`
- **Getting data from PsychoPy / jsPsych / an online platform into GRIN:** `docs/data_collection.md`
- **How the stages fit together, and what each one writes:** `docs/PIPELINE.md`
- **Cutting a release (models to the site, numbers to the manuscript):** `docs/RELEASE.md`
- **Status of the response-time extension:** `docs/dynamic_grt_rt_design.md` §0

Everything runs **from the project root**. Paths in `src/config.py` are absolute, so outputs
land in `data/` and `results/` regardless of where you invoke from.

## Packages

This repo trains GRIN and produces the two things people actually install. Both wrap
the same trained weights (numerically verified to agree) and are otherwise independent
of each other and of the training pipeline above:

- **[`packages/grintools/`](https://github.com/MurraySBennett/grin/tree/874a2e88e9de6dca6727a54274823fa79bc383f7/packages/grintools/)** — Python, `pip install grintools`. Torch-free at
  runtime (ONNX + `onnxruntime` only).
- **[`packages/grin/`](https://github.com/MurraySBennett/grin/tree/874a2e88e9de6dca6727a54274823fa79bc383f7/packages/grin/)** — R, native inference via the `torch` package
  (libtorch) — no Python required. `remotes::install_github("MurraySBennett/grin", subdir = "packages/grin")`.

Everything else in the repo (`src/`, `scripts/`, `data/`, `results/`, `validation/`, `web/`) is
how the model is trained and validated, not something an end user needs to touch.
