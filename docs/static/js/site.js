(() => {
  const renderPageMath = () => {
    if (!window.katex) {
      console.warn("KaTeX did not load; keeping readable equation fallbacks.");
      return;
    }

    document.querySelectorAll("[data-tex]").forEach((element) => {
      window.katex.render(element.dataset.tex, element, {
        displayMode: element.hasAttribute("data-tex-display"),
        output: "htmlAndMathml",
        strict: "warn",
        throwOnError: false,
        trust: false,
      });
      element.dataset.mathRendered = "true";
    });
  };

  renderPageMath();

  const mathDisplays = [...document.querySelectorAll(".math-display")];
  const mobileEquationQuery = window.matchMedia("(max-width: 520px)");

  const updateMathOverflow = () => {
    mathDisplays.forEach((display) => {
      const isOverflowing = display.scrollWidth > display.clientWidth + 2;
      display.classList.toggle("math-display--overflowing", isOverflowing);

      if (isOverflowing) {
        display.tabIndex = 0;
        display.dataset.mathScrollable = "true";
      } else if (display.dataset.mathScrollable === "true") {
        display.removeAttribute("tabindex");
        delete display.dataset.mathScrollable;
      }

      let hint = display.nextElementSibling;
      if (!hint?.matches("[data-math-scroll-hint]")) {
        hint = document.createElement("span");
        hint.className = "math-scroll-hint";
        hint.dataset.mathScrollHint = "";
        hint.setAttribute("aria-hidden", "true");
        hint.textContent = "Swipe to see the full equation →";
        display.insertAdjacentElement("afterend", hint);
      }
      hint.hidden = !(isOverflowing && mobileEquationQuery.matches);
    });
  };

  window.requestAnimationFrame(updateMathOverflow);
  window.addEventListener("load", updateMathOverflow, { once: true });
  window.addEventListener("resize", updateMathOverflow, { passive: true });
  mobileEquationQuery.addEventListener?.("change", updateMathOverflow);

  document.querySelectorAll("[data-technical-details]").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) window.requestAnimationFrame(updateMathOverflow);
    });
  });

  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const pageRegions = [...document.querySelectorAll("main, footer")];

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
  };

  const closeNav = (returnFocus = false) => {
    if (!nav || !navToggle) return;
    const wasOpen = navToggle.getAttribute("aria-expanded") === "true";
    nav.classList.remove("is-open");
    header?.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
    pageRegions.forEach((region) => region.removeAttribute("inert"));
    if (returnFocus && wasOpen) navToggle.focus();
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  navToggle?.addEventListener("click", () => {
    const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
    nav?.classList.toggle("is-open", willOpen);
    header?.classList.toggle("is-open", willOpen);
    navToggle.setAttribute("aria-expanded", String(willOpen));
    document.body.classList.toggle("nav-open", willOpen);
    pageRegions.forEach((region) => region.toggleAttribute("inert", willOpen));
    if (willOpen) nav?.querySelector("a")?.focus();
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeNav());
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 780) closeNav();
  }, { passive: true });

  const revealHashTarget = () => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    target.closest("details:not([open])")?.setAttribute("open", "");
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    target.scrollIntoView({ block: "start" });
    document.documentElement.style.scrollBehavior = previousBehavior;
  };

  window.addEventListener("load", revealHashTarget);
  window.addEventListener("hashchange", revealHashTarget);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const paradigmAnimations = [...document.querySelectorAll("[data-paradigm-animation]")];

  const setParadigmAnimation = (root, shouldPlay) => {
    const image = root.querySelector("img[data-static-src][data-animated-src]");
    if (!image) return;

    image.src = shouldPlay ? image.dataset.animatedSrc : image.dataset.staticSrc;
  };

  paradigmAnimations.forEach((root) => {
    setParadigmAnimation(root, !reducedMotion.matches);
  });

  reducedMotion.addEventListener?.("change", () => {
    paradigmAnimations.forEach((root) => {
      setParadigmAnimation(root, !reducedMotion.matches);
    });
  });

  const rolloutRestartDelay = 500;

  document.querySelectorAll(".rollout-comparison").forEach((comparison) => {
    const videos = [...comparison.querySelectorAll(".rollout-video-card video")];
    if (videos.length < 2) return;

    let restartTimer = null;
    let initialRoundStarted = false;

    const cancelPendingRestart = () => {
      if (restartTimer === null) return;
      window.clearTimeout(restartTimer);
      restartTimer = null;
    };

    const startRoundTogether = () => {
      videos.forEach((video) => {
        video.currentTime = 0;
        video.controls = true;
      });
      const playbackAttempts = videos.map((video) => video.play());
      Promise.all(playbackAttempts).catch(() => {
        // Keep the pair together if a device requires manual playback.
        videos.forEach((video) => video.pause());
      });
    };

    const startInitialRoundWhenReady = () => {
      if (initialRoundStarted) return;
      const pairIsReady = videos.every(
        (video) => video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA,
      );
      if (!pairIsReady) return;

      initialRoundStarted = true;
      startRoundTogether();
    };

    const queueNextRound = () => {
      if (restartTimer !== null || !videos.every((video) => video.ended)) return;

      restartTimer = window.setTimeout(() => {
        restartTimer = null;
        // Respect manual seeking or replay during the half-second end pause.
        if (!videos.every((video) => video.ended)) return;
        startRoundTogether();
      }, rolloutRestartDelay);
    };

    videos.forEach((video) => {
      video.loop = false;
      video.muted = true;
      video.defaultMuted = true;
      video.addEventListener("canplay", startInitialRoundWhenReady);
      video.addEventListener("ended", () => {
        // Native controls otherwise cover the final frame during the end pause.
        video.controls = false;
        queueNextRound();
      });
      video.addEventListener("play", () => {
        if (!videos.every((pairedVideo) => pairedVideo.ended)) cancelPendingRestart();
      });
      video.addEventListener("seeking", cancelPendingRestart);
    });

    startInitialRoundWhenReady();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav(true);
  });

  const bifurcationRoot = document.querySelector("[data-bifurcation-demo]");

  const initBifurcationDemo = (root) => {
    const fallback = root.querySelector("[data-bifurcation-fallback]");
    const interactive = root.querySelector("[data-bifurcation-interactive]");
    const sigma0Input = root.querySelector("[data-bifurcation-sigma0]");
    const sigma0Outputs = [...root.querySelectorAll("[data-bifurcation-sigma0-output]")];
    const fidelityOutputs = [...root.querySelectorAll("[data-bifurcation-fidelity-output]")];
    const sensitivityOutput = root.querySelector("[data-bifurcation-sensitivity-output]");
    const status = root.querySelector("[data-bifurcation-status]");
    const plots = {
      truth: root.querySelector("[data-bifurcation-plot='truth']"),
      sf: root.querySelector("[data-bifurcation-plot='sf']"),
      posterior: root.querySelector("[data-bifurcation-plot='posterior']"),
      latent: root.querySelector("[data-bifurcation-plot='latent']"),
      sensitivity: root.querySelector("[data-bifurcation-plot='sensitivity']"),
    };

    if (!fallback || !interactive || !sigma0Input
      || Object.values(plots).some((plot) => !plot)) return;

    const NS = "http://www.w3.org/2000/svg";
    // Appendix toy model. sigma0 is the component standard deviation at t = 0;
    // epsilon_tau = sigma0 exp(-k tau) is the split-time W2 fidelity error.
    const model = {
      T: 1.15,
      tau: 0.4,
      k: 1.4,
      slope: 3.2,
      // Both diagnostics use the same post-split physical time, t = 0.60.
      posteriorTime: 0.6,
      sensitivityTime: 0.6,
      // This sigma0 interval keeps the complete linked sensitivity curve inside
      // the paper-style raw linear viewport while retaining the sigma0 = 0.34 reference.
      sigma0Min: 0.27,
      sigma0Max: 1.8,
      fixedProbe: 0.01,
      posteriorXMax: 0.1,
      // At sigma0 = 1.8 the positive/negative component tubes nearly reach
      // +/-2.76 at T, so retain a small visual margin around them.
      xMin: -2.9,
      xMax: 2.9,
    };
    const branchFrame = { left: 62, right: 30, top: 18, bottom: 50, width: 360, height: 300 };
    const sensitivityFrame = { left: 72, right: 18, top: 18, bottom: 52, width: 360, height: 300 };
    const posteriorFrame = { left: 58, right: 16, top: 34, bottom: 44, width: 280, height: 180 };
    const latentInputs = [...root.querySelectorAll("[data-bifurcation-latent]")];

    const svgElement = (name, attributes = {}, text = "") => {
      const element = document.createElementNS(NS, name);
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
      if (text) element.textContent = text;
      return element;
    };

    const add = (parent, name, attributes = {}, text = "") => {
      const element = svgElement(name, attributes, text);
      parent.appendChild(element);
      return element;
    };

    const range = (start, end, count) => Array.from(
      { length: count },
      (_, index) => start + ((end - start) * index) / (count - 1),
    );

    const pathFrom = (points, xScale, yScale) => points
      .map(([x, y], index) => `${index ? "L" : "M"}${xScale(x).toFixed(2)},${yScale(y).toFixed(2)}`)
      .join(" ");

    const superscript = (value) => String(value)
      .split("")
      .map((character) => ({
        "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴",
        5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹",
      })[character] || character)
      .join("");

    const scientific = (value, digits = 2) => {
      if (value === 0) return "0";
      const exponent = Math.floor(Math.log10(Math.abs(value)));
      const coefficient = value / (10 ** exponent);
      return `${coefficient.toFixed(digits)} × 10${superscript(exponent)}`;
    };

    const formatEpsilon = (value) => {
      if (value >= 0.1) return value.toFixed(3);
      if (value >= 0.01) return value.toFixed(3);
      return scientific(value);
    };

    const formatSensitivity = (value) => {
      if (Math.abs(value) < 1e4) return value.toFixed(2);
      if (Math.abs(value) < 1e6) {
        return value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return scientific(value);
    };

    const sigma0SliderMin = Number.parseFloat(sigma0Input.min);
    const sigma0SliderMax = Number.parseFloat(sigma0Input.max);

    const m = (time) => model.slope * Math.max(time - model.tau, 0);
    const sigma = (time, sigma0) => sigma0 * Math.exp(-model.k * time);
    const fidelityError = (sigma0) => sigma(model.tau, sigma0);
    const posteriorMean = (x, time, sigma0) => {
      const spread = sigma(time, sigma0);
      const branchLogit = (x * m(time)) / (spread * spread);
      return Math.tanh(Math.max(-30, Math.min(30, branchLogit)));
    };
    const posteriorTransitionWidth = (sigma0) => (
      sigma(model.posteriorTime, sigma0) ** 2 / m(model.posteriorTime)
    );
    const q = (time) => model.slope + model.k * m(time);
    const sfVelocity = (state, time, sigma0) => {
      const branchLogit = (state * m(time) * Math.exp(2 * model.k * time))
        / (sigma0 * sigma0);
      return -model.k * state
        + q(time) * Math.tanh(Math.max(-30, Math.min(30, branchLogit)));
    };
    const rk4Step = (state, time, step, sigma0) => {
      const k1 = sfVelocity(state, time, sigma0);
      const k2 = sfVelocity(state + (step * k1) / 2, time + step / 2, sigma0);
      const k3 = sfVelocity(state + (step * k2) / 2, time + step / 2, sigma0);
      const k4 = sfVelocity(state + step * k3, time + step, sigma0);
      return state + (step * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    };
    const timeDelta = model.sensitivityTime - model.tau;
    const sensitivityCoefficient = (
      m(model.sensitivityTime) ** 2 * Math.exp(2 * model.k * timeDelta)
    ) / 2;
    const logSensitivityFromFidelity = (epsilon) => (
      -model.k * timeDelta + sensitivityCoefficient / (epsilon * epsilon)
    );
    const logSensitivity = (sigma0) => logSensitivityFromFidelity(fidelityError(sigma0));

    const scalesForBranchPlot = () => {
      const plotWidth = branchFrame.width - branchFrame.left - branchFrame.right;
      const plotHeight = branchFrame.height - branchFrame.top - branchFrame.bottom;
      return {
        x: (value) => branchFrame.left
          + ((value - model.xMin) / (model.xMax - model.xMin)) * plotWidth,
        t: (value) => branchFrame.top + (value / model.T) * plotHeight,
      };
    };

    const setupBranchPlot = (svg, id, title, description) => {
      svg.replaceChildren();
      add(svg, "title", { id: `bifurcation-${id}-title` }, title);
      add(svg, "desc", { id: `bifurcation-${id}-desc` }, description);
      const scales = scalesForBranchPlot();
      const bottom = branchFrame.height - branchFrame.bottom;
      const right = branchFrame.width - branchFrame.right;

      [-2, 0, 2].forEach((tick) => {
        add(svg, "line", {
          x1: scales.x(tick), y1: branchFrame.top, x2: scales.x(tick), y2: bottom,
          class: "plot-grid",
        });
        add(svg, "line", {
          x1: scales.x(tick), y1: bottom, x2: scales.x(tick), y2: bottom + 4,
          class: "plot-axis",
        });
        add(svg, "text", {
          x: scales.x(tick), y: bottom + 17, class: "plot-tick", "text-anchor": "middle",
        }, String(tick).replace("-", "−"));
      });

      [
        { value: 0, label: "0" },
        { value: model.tau, label: "split" },
        { value: model.T, label: "end" },
      ].forEach(({ value, label }) => {
        add(svg, "line", {
          x1: branchFrame.left - 4, y1: scales.t(value), x2: branchFrame.left, y2: scales.t(value),
          class: "plot-axis",
        });
        add(svg, "text", {
          x: branchFrame.left - 8,
          y: scales.t(value) + 3,
          class: "plot-tick",
          "text-anchor": "end",
        }, label);
      });

      add(svg, "line", {
        x1: branchFrame.left, y1: scales.t(model.tau), x2: right, y2: scales.t(model.tau),
        class: "plot-guide plot-guide--tau",
      });
      add(svg, "text", {
        x: right - 4,
        y: scales.t(model.tau) - 7,
        class: "plot-note",
        "text-anchor": "end",
      }, `τ = ${model.tau.toFixed(2)}`);
      add(svg, "line", {
        x1: branchFrame.left, y1: branchFrame.top, x2: branchFrame.left, y2: bottom,
        class: "plot-axis",
      });
      add(svg, "line", {
        x1: branchFrame.left, y1: bottom, x2: right, y2: bottom,
        class: "plot-axis",
      });
      add(svg, "text", {
        x: (branchFrame.left + right) / 2,
        y: branchFrame.height - 12,
        class: "plot-label",
        "text-anchor": "middle",
      }, "physical state");
      add(svg, "text", {
        x: 14,
        y: (branchFrame.top + bottom) / 2,
        class: "plot-label",
        "text-anchor": "middle",
        transform: `rotate(-90 14 ${(branchFrame.top + bottom) / 2})`,
      }, "physical time");

      const layer = add(svg, "g");
      return { ...scales, layer };
    };

    const branchPoints = (sign, start = model.tau, end = model.T, count = 64) => range(start, end, count)
      .map((time) => [sign * m(time), time]);

    const bandPolygon = (center, start, end, sigma0, xScale, tScale, count = 56) => {
      const times = range(start, end, count);
      const upper = times.map((time) => [center(time) + sigma(time, sigma0), time]);
      const lower = [...times].reverse().map((time) => [center(time) - sigma(time, sigma0), time]);
      return [...upper, ...lower]
        .map(([x, time]) => `${xScale(x).toFixed(2)},${tScale(time).toFixed(2)}`)
        .join(" ");
    };

    const drawGroundTruth = () => {
      const { x, t, layer } = setupBranchPlot(
        plots.truth,
        "truth",
        "Ground-truth bifurcation",
        `Two trajectories share physical state zero until time tau ${model.tau.toFixed(2)}, then separate into a blue B equals plus one future and an orange B equals minus one future.`,
      );
      add(layer, "path", {
        d: pathFrom([[0, 0], [0, model.tau]], x, t),
        class: "plot-stem",
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(1), x, t),
        class: "plot-branch--positive",
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(-1), x, t),
        class: "plot-branch--negative",
      });
      add(layer, "circle", { cx: x(0), cy: t(model.tau), r: 4, class: "plot-split" });
    };

    const sfProbeTrajectory = (sigma0, count = 128, substeps = 4) => {
      // Integrate the displayed population-optimal field directly from the fixed
      // split-time probe x_tau = +0.01. Odd symmetry gives the negative trajectory.
      const times = range(model.tau, model.T, count);
      const trajectory = [[model.fixedProbe, model.tau]];
      let state = model.fixedProbe;
      let currentTime = model.tau;
      for (let sample = 1; sample < times.length; sample += 1) {
        const targetTime = times[sample];
        const step = (targetTime - currentTime) / substeps;
        for (let substep = 0; substep < substeps; substep += 1) {
          state = rk4Step(state, currentTime, step, sigma0);
          currentTime += step;
        }
        trajectory.push([state, targetTime]);
      }
      return trajectory;
    };

    const targetBranchPoints = (sign) => [
      [0, 0],
      ...branchPoints(sign),
    ];

    const drawBranchPosterior = (sigma0) => {
      const svg = plots.posterior;
      svg.replaceChildren();
      const xLimit = model.posteriorXMax;
      const transitionWidth = posteriorTransitionWidth(sigma0);
      const plotWidth = posteriorFrame.width - posteriorFrame.left - posteriorFrame.right;
      const plotHeight = posteriorFrame.height - posteriorFrame.top - posteriorFrame.bottom;
      const bottom = posteriorFrame.height - posteriorFrame.bottom;
      const right = posteriorFrame.width - posteriorFrame.right;
      const x = (state) => posteriorFrame.left
        + ((state + xLimit) / (2 * xLimit)) * plotWidth;
      const y = (value) => posteriorFrame.top
        + ((1.05 - value) / 2.1) * plotHeight;

      const posteriorTimeLabel = model.posteriorTime.toFixed(2);
      add(svg, "title", { id: "bifurcation-posterior-title" }, `Posterior branch mean at physical time ${posteriorTimeLabel}`);
      add(svg, "desc", { id: "bifurcation-posterior-desc" }, `The posterior expectation of branch label B conditional on physical state X at time ${posteriorTimeLabel}, shown from state minus 0.10 to plus 0.10 and expectation minus one to plus one.`);
      add(svg, "text", {
        x: (posteriorFrame.left + right) / 2,
        y: 19,
        class: "plot-posterior-title",
        "text-anchor": "middle",
      }, `Posterior branch mean at t = ${posteriorTimeLabel}`);

      add(svg, "line", {
        x1: posteriorFrame.left,
        y1: y(0),
        x2: right,
        y2: y(0),
        class: "plot-posterior-guide",
      });
      add(svg, "line", {
        x1: x(0),
        y1: posteriorFrame.top,
        x2: x(0),
        y2: bottom,
        class: "plot-posterior-guide",
      });
      add(svg, "line", {
        x1: posteriorFrame.left,
        y1: posteriorFrame.top,
        x2: posteriorFrame.left,
        y2: bottom,
        class: "plot-axis",
      });
      add(svg, "line", {
        x1: posteriorFrame.left,
        y1: bottom,
        x2: right,
        y2: bottom,
        class: "plot-axis",
      });

      [-1, 0, 1].forEach((tick) => {
        add(svg, "line", {
          x1: posteriorFrame.left - 4,
          y1: y(tick),
          x2: posteriorFrame.left,
          y2: y(tick),
          class: "plot-axis",
        });
        add(svg, "text", {
          x: posteriorFrame.left - 8,
          y: y(tick) + 3,
          class: "plot-tick",
          "text-anchor": "end",
        }, String(tick).replace("-", "−"));
      });
      [
        { value: -xLimit, label: "−0.10" },
        { value: 0, label: "0" },
        { value: xLimit, label: "0.10" },
      ].forEach(({ value, label }) => {
        add(svg, "line", {
          x1: x(value),
          y1: bottom,
          x2: x(value),
          y2: bottom + 4,
          class: "plot-axis",
        });
        add(svg, "text", {
          x: x(value),
          y: bottom + 15,
          class: "plot-tick",
          "text-anchor": "middle",
        }, label);
      });

      add(svg, "text", {
        x: (posteriorFrame.left + right) / 2,
        y: posteriorFrame.height - 9,
        class: "plot-label",
        "text-anchor": "middle",
      }, "physical state x");
      add(svg, "text", {
        x: 15,
        y: (posteriorFrame.top + bottom) / 2,
        class: "plot-label",
        "text-anchor": "middle",
        transform: `rotate(-90 15 ${(posteriorFrame.top + bottom) / 2})`,
      }, "E[B | Xₜ = x]");

      const adaptiveStates = [-8, -4, -2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 4, 8]
        .map((multiple) => multiple * transitionWidth)
        .filter((state) => Math.abs(state) < xLimit);
      const curveStates = [...range(-xLimit, xLimit, 151), ...adaptiveStates]
        .sort((first, second) => first - second)
        .filter((state, index, states) => index === 0 || state !== states[index - 1]);
      const curve = curveStates.map((state) => [
        state,
        posteriorMean(state, model.posteriorTime, sigma0),
      ]);
      add(svg, "path", {
        d: pathFrom(curve, x, y),
        class: "plot-posterior-curve",
      });
    };

    const drawStandardSF = (sigma0) => {
      const probe = model.fixedProbe;
      const positiveTrajectory = sfProbeTrajectory(sigma0);
      const negativeTrajectory = positiveTrajectory.map(([state, time]) => [-state, time]);
      const epsilon = fidelityError(sigma0);
      const description = `The dashed data paths stay fixed. The solid green and red curves solve the population-optimal Standard Streaming Flow equation from fixed split-time states minus and plus ${probe.toFixed(2)}. Initial tube scale sigma zero ${sigma0.toFixed(3)} gives fidelity error epsilon tau ${formatEpsilon(epsilon)}.`;
      const { x, t, layer } = setupBranchPlot(
        plots.sf,
        "sf",
        "Fixed target and live Standard Streaming Flow generation",
        description,
      );

      add(layer, "polygon", {
        points: bandPolygon(() => 0, 0, model.tau, sigma0, x, t),
        class: "plot-tube--shared",
      });
      add(layer, "polygon", {
        points: bandPolygon((time) => m(time), model.tau, model.T, sigma0, x, t),
        class: "plot-tube--positive",
      });
      add(layer, "polygon", {
        points: bandPolygon((time) => -m(time), model.tau, model.T, sigma0, x, t),
        class: "plot-tube--negative",
      });

      add(layer, "path", {
        d: pathFrom(targetBranchPoints(-1), x, t),
        class: "plot-paper-target plot-paper-target--negative",
        "data-series": "fixed-target-negative",
      });
      add(layer, "path", {
        d: pathFrom(targetBranchPoints(1), x, t),
        class: "plot-paper-target plot-paper-target--positive",
        "data-series": "fixed-target-positive",
      });

      add(layer, "path", {
        d: pathFrom(positiveTrajectory, x, t),
        class: "plot-sf-characteristic plot-sf-characteristic--positive",
        "data-series": "sf-characteristic-positive",
      });
      add(layer, "path", {
        d: pathFrom(negativeTrajectory, x, t),
        class: "plot-sf-characteristic plot-sf-characteristic--negative",
        "data-series": "sf-characteristic-negative",
      });

      drawBranchPosterior(sigma0);
    };

    const drawLatent = (selection = "both") => {
      const { x, t, layer } = setupBranchPlot(
        plots.latent,
        "latent",
        "Ideal latent bifurcation",
        "The two futures share the same physical split state, while the sign of latent Z selects the branch-specific velocity field.",
      );
      const positiveClass = selection === "negative" ? " is-muted" : "";
      const negativeClass = selection === "positive" ? " is-muted" : "";

      add(layer, "path", {
        d: pathFrom([[0, 0], [0, model.tau]], x, t),
        class: "plot-stem",
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(1), x, t),
        class: `plot-latent-branch plot-latent-branch--positive${positiveClass}`,
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(-1), x, t),
        class: `plot-latent-branch plot-latent-branch--negative${negativeClass}`,
      });
      add(layer, "circle", { cx: x(0), cy: t(model.tau), r: 4, class: "plot-split" });
    };

    const drawSensitivity = (sigma0) => {
      const svg = plots.sensitivity;
      svg.replaceChildren();
      const sensitivity = logSensitivity(sigma0);
      const epsilon = fidelityError(sigma0);
      const sensitivityTimeLabel = model.sensitivityTime.toFixed(2);
      add(svg, "title", { id: "bifurcation-sensitivity-title" }, `Standard Streaming Flow sensitivity versus fidelity error at physical time ${sensitivityTimeLabel}`);
      add(svg, "desc", { id: "bifurcation-sensitivity-desc" }, `At physical time ${sensitivityTimeLabel} on raw linear axes, standard Streaming Flow log sensitivity is ${formatSensitivity(sensitivity)} at fidelity error epsilon tau ${formatEpsilon(epsilon)}. A dashed line shows the ideal latent sensitivity. The complete selectable range is visible.`);

      const plotWidth = sensitivityFrame.width - sensitivityFrame.left - sensitivityFrame.right;
      const plotHeight = sensitivityFrame.height - sensitivityFrame.top - sensitivityFrame.bottom;
      const yMin = -2;
      const yMax = 16;
      const epsilonMin = fidelityError(model.sigma0Min);
      const epsilonMax = fidelityError(model.sigma0Max);
      const x = (value) => sensitivityFrame.left
        + ((value - epsilonMin) / (epsilonMax - epsilonMin)) * plotWidth;
      const y = (value) => sensitivityFrame.top
        + ((yMax - value) / (yMax - yMin)) * plotHeight;
      const bottom = sensitivityFrame.height - sensitivityFrame.bottom;
      const right = sensitivityFrame.width - sensitivityFrame.right;
      const definitions = add(svg, "defs");
      const plotClip = add(definitions, "clipPath", { id: "sensitivity-plot-clip" });
      add(plotClip, "rect", {
        x: sensitivityFrame.left,
        y: sensitivityFrame.top,
        width: plotWidth,
        height: plotHeight,
      });
      [
        { value: 0, label: "0" },
        { value: 4, label: "4" },
        { value: 8, label: "8" },
        { value: 12, label: "12" },
        { value: 16, label: "16" },
      ].forEach(({ value, label }) => {
        add(svg, "line", {
          x1: sensitivityFrame.left - 4, y1: y(value), x2: sensitivityFrame.left, y2: y(value), class: "plot-axis",
        });
        add(svg, "text", {
          x: sensitivityFrame.left - 8,
          y: y(value) + 3,
          class: "plot-tick plot-sensitivity-tick",
          "text-anchor": "end",
        }, label);
      });
      const epsilonTicks = [
        { value: epsilonMin, label: epsilonMin.toFixed(2), startpoint: true },
        { value: 0.35, label: "0.35" },
        { value: 0.55, label: "0.55" },
        { value: 0.75, label: "0.75" },
        { value: epsilonMax, label: epsilonMax.toFixed(2), endpoint: true },
      ];
      epsilonTicks.forEach(({ value: tick, label, endpoint = false, startpoint = false }) => {
        add(svg, "line", {
          x1: x(tick), y1: bottom, x2: x(tick), y2: bottom + 4, class: "plot-axis",
        });
        add(svg, "text", {
          x: x(tick) + (startpoint ? 1 : (endpoint ? -1 : 0)),
          y: bottom + 17,
          class: "plot-tick plot-sensitivity-tick",
          "text-anchor": startpoint ? "start" : (endpoint ? "end" : "middle"),
        }, label);
      });
      add(svg, "line", {
        x1: sensitivityFrame.left, y1: sensitivityFrame.top, x2: sensitivityFrame.left, y2: bottom,
        class: "plot-axis",
      });
      add(svg, "line", {
        x1: sensitivityFrame.left, y1: bottom, x2: right, y2: bottom, class: "plot-axis",
      });
      add(svg, "text", {
        x: (sensitivityFrame.left + right) / 2,
        y: sensitivityFrame.height - 12,
        class: "plot-label plot-sensitivity-axis-label",
        "text-anchor": "middle",
      }, "fidelity error");
      add(svg, "text", {
        x: 16,
        y: (sensitivityFrame.top + bottom) / 2,
        class: "plot-label plot-sensitivity-axis-label",
        "text-anchor": "middle",
        transform: `rotate(-90 16 ${(sensitivityFrame.top + bottom) / 2})`,
      }, "log physical-state sensitivity");
      const curve = range(epsilonMin, epsilonMax, 260)
        .map((value) => [value, logSensitivityFromFidelity(value)]);
      add(svg, "path", {
        d: pathFrom(curve, x, y),
        class: "plot-curve",
        "clip-path": "url(#sensitivity-plot-clip)",
      });

      const idealLogSensitivity = -model.k * timeDelta;
      add(svg, "line", {
        x1: sensitivityFrame.left,
        y1: y(idealLogSensitivity),
        x2: right,
        y2: y(idealLogSensitivity),
        class: "plot-ideal-baseline",
      });

      const markerX = x(epsilon);
      const markerY = y(sensitivity);
      if (epsilon > epsilonMin * 1.001 && epsilon < epsilonMax * 0.999) {
        add(svg, "line", {
          x1: markerX, y1: markerY, x2: markerX, y2: bottom, class: "plot-sensitivity-guide",
        });
      }
      add(svg, "circle", {
        cx: markerX,
        cy: markerY,
        r: 4.5,
        class: "plot-marker",
      });
    };

    const selectedLatent = () => latentInputs.find((input) => input.checked)?.value || "both";

    const updateSigma0 = (announce = false) => {
      const sigma0 = Number.parseFloat(sigma0Input.value);
      const epsilon = fidelityError(sigma0);
      const sensitivity = logSensitivity(sigma0);
      const sigma0Label = sigma0.toFixed(3);
      const epsilonLabel = formatEpsilon(epsilon);
      const sensitivityLabel = formatSensitivity(sensitivity);
      sigma0Outputs.forEach((output) => { output.textContent = sigma0Label; });
      fidelityOutputs.forEach((output) => { output.textContent = epsilonLabel; });
      if (sensitivityOutput) sensitivityOutput.textContent = sensitivityLabel;
      const progress = ((sigma0 - sigma0SliderMin)
        / (sigma0SliderMax - sigma0SliderMin)) * 100;
      sigma0Input.style.setProperty("--range-progress", `${progress.toFixed(1)}%`);
      sigma0Input.setAttribute(
        "aria-valuetext",
        `sigma zero ${sigma0.toFixed(3)}; split-time fidelity error epsilon tau ${epsilon.toFixed(3)}; fixed probe half-width ${model.fixedProbe.toFixed(2)}; linear control`,
      );
      drawStandardSF(sigma0);
      drawSensitivity(sigma0);
      if (announce && status) {
        status.textContent = `Initial tube scale sigma zero ${sigma0.toFixed(3)} gives fidelity error epsilon tau ${epsilon.toFixed(3)} and Standard Streaming Flow log sensitivity ${sensitivity.toFixed(2)}. Probe states remain fixed at minus and plus ${model.fixedProbe.toFixed(2)}.`;
      }
    };

    drawGroundTruth();
    drawLatent(selectedLatent());
    updateSigma0();
    interactive.hidden = false;
    fallback.hidden = true;

    let sigma0AnimationFrame = 0;
    let announcementTimer = 0;
    const announceAfterPause = (update) => {
      window.clearTimeout(announcementTimer);
      announcementTimer = window.setTimeout(() => update(true), 450);
    };
    sigma0Input.addEventListener("input", () => {
      window.cancelAnimationFrame(sigma0AnimationFrame);
      sigma0AnimationFrame = window.requestAnimationFrame(() => updateSigma0());
    });
    sigma0Input.addEventListener("change", () => {
      window.cancelAnimationFrame(sigma0AnimationFrame);
      updateSigma0();
      announceAfterPause(updateSigma0);
    });
    latentInputs.forEach((input) => {
      input.addEventListener("change", () => {
        window.clearTimeout(announcementTimer);
        drawLatent(selectedLatent());
        if (status) {
          const label = input.value === "both" ? "both latent branches" : `the ${input.value} latent branch`;
          status.textContent = `Highlighting ${label}.`;
        }
      });
    });
  };

  if (bifurcationRoot) {
    try {
      initBifurcationDemo(bifurcationRoot);
    } catch (error) {
      console.error("The interactive bifurcation figure could not be initialized.", error);
    }
  }

  const energyRoot = document.querySelector("[data-energy-demo]");

  const initEnergyDemo = (root) => {
    const interactive = root.querySelector(".energy-interactive");
    const alphaInput = root.querySelector("[data-energy-alpha]");
    const alphaOutput = root.querySelector("[data-energy-alpha-output]");
    const regimeOutput = root.querySelector("[data-energy-alpha-regime]");
    const selectedPairOutput = root.querySelector("[data-energy-selected-pair]");
    const relativeOutput = root.querySelector("[data-energy-relative-output]");
    const status = root.querySelector("[data-energy-status]");
    const boundPlot = root.querySelector("[data-energy-bound-plot]");
    const lossPlot = root.querySelector("[data-energy-loss-plot]");
    const predictionButtons = [...root.querySelectorAll("[data-energy-prediction]")];

    if (!interactive || !alphaInput || !alphaOutput || !regimeOutput
      || !selectedPairOutput || !relativeOutput
      || !boundPlot || !lossPlot || !predictionButtons.length) return;

    const NS = "http://www.w3.org/2000/svg";
    const model = {
      alphaMin: Number.parseFloat(alphaInput.min),
      alphaMax: Number.parseFloat(alphaInput.max),
      posteriorAccuracy: 0.85,
      predictionLow: -0.7,
      predictionHigh: 0.7,
    };

    const svgElement = (name, attributes = {}, text = "") => {
      const element = document.createElementNS(NS, name);
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
      if (text) element.textContent = text;
      return element;
    };

    const add = (parent, name, attributes = {}, text = "") => {
      const element = svgElement(name, attributes, text);
      parent.appendChild(element);
      return element;
    };

    const formatMetric = (value) => {
      if (Math.abs(value) < 1e-12) return "0";
      if (Math.abs(value) < 0.001) return value.toExponential(2).replace("e-", "e−");
      return value.toFixed(3);
    };

    const formatSigned = (value) => `${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(1)}`;

    const generalizedEnergyReconstruction = (low, high, alpha) => 0.25 * (
      Math.abs(low + 1) ** alpha
      + Math.abs(low - 1) ** alpha
      + Math.abs(high + 1) ** alpha
      + Math.abs(high - 1) ** alpha
    ) - 0.25 * Math.abs(high - low) ** alpha;

    const relativeGeneralizedEnergyReconstruction = (low, high, alpha) => {
      const value = generalizedEnergyReconstruction(low, high, alpha) - 2 ** (alpha - 2);
      return Math.abs(value) < 1e-12 ? 0 : Math.max(0, value);
    };

    const halfEnergyDistance = (alpha) => relativeGeneralizedEnergyReconstruction(
      model.predictionLow,
      model.predictionHigh,
      alpha,
    );

    const expectedGeneralizedEnergyReconstruction = (alpha) => {
      const low = model.predictionLow;
      const high = model.predictionHigh;
      const accuracy = model.posteriorAccuracy;
      const attraction = 0.5 * (
        accuracy * Math.abs(low + 1) ** alpha
        + (1 - accuracy) * Math.abs(high + 1) ** alpha
        + accuracy * Math.abs(high - 1) ** alpha
        + (1 - accuracy) * Math.abs(low - 1) ** alpha
      );
      return attraction
        - accuracy * (1 - accuracy) * Math.abs(high - low) ** alpha;
    };

    const drawBound = (alpha, isFailure) => {
      boundPlot.replaceChildren();
      const distance = halfEnergyDistance(alpha);
      const reconstruction = expectedGeneralizedEnergyReconstruction(alpha);
      add(boundPlot, "title", { id: "energy-bound-title" }, "Prediction–truth mismatch and training reconstruction loss");
      add(
        boundPlot,
        "desc",
        { id: "energy-bound-desc" },
        `True velocities are minus and plus one, while the selected predictions are ${model.predictionLow} and ${model.predictionHigh}. At alpha ${alpha.toFixed(3)}, the prediction–truth mismatch is ${formatMetric(distance)} and the training reconstruction loss L E S is ${formatMetric(reconstruction)}.`,
      );

      const x = (value) => 120 + ((value + 1.25) / 2.5) * 420;
      const truthY = 70;
      const predictionY = 132;
      const zeroX = x(0);

      add(boundPlot, "line", {
        x1: zeroX, y1: 43, x2: zeroX, y2: 157, class: "energy-bound-guide",
      });
      add(boundPlot, "text", { x: 14, y: truthY + 5, class: "energy-plot-label" }, "truth");
      add(boundPlot, "text", { x: 14, y: predictionY + 5, class: "energy-plot-label" }, "prediction");

      const truthNegativeX = x(-1);
      const truthPositiveX = x(1);
      const predictionLowX = x(model.predictionLow);
      const predictionHighX = x(model.predictionHigh);

      add(boundPlot, "path", {
        d: `M${truthNegativeX},${truthY} L${predictionLowX},${predictionY}`,
        class: "energy-bound-link",
      });
      add(boundPlot, "path", {
        d: `M${truthPositiveX},${truthY} L${predictionHighX},${predictionY}`,
        class: "energy-bound-link",
      });
      add(boundPlot, "path", {
        d: `M${truthNegativeX},${truthY} L${predictionHighX},${predictionY}`,
        class: "energy-bound-link energy-bound-link--unlikely",
      });
      add(boundPlot, "path", {
        d: `M${truthPositiveX},${truthY} L${predictionLowX},${predictionY}`,
        class: "energy-bound-link energy-bound-link--unlikely",
      });

      const diamond = (centerX) => add(boundPlot, "path", {
        d: `M${centerX},${truthY - 8} L${centerX + 8},${truthY} L${centerX},${truthY + 8} L${centerX - 8},${truthY} Z`,
        class: "energy-bound-data",
      });
      diamond(truthNegativeX);
      diamond(truthPositiveX);
      add(boundPlot, "circle", {
        cx: predictionLowX, cy: predictionY, r: 8, class: "energy-bound-prediction",
      });
      add(boundPlot, "circle", {
        cx: predictionHighX, cy: predictionY, r: 8, class: "energy-bound-prediction",
      });

      add(boundPlot, "text", {
        x: truthNegativeX, y: truthY - 14, class: "energy-plot-note", "text-anchor": "middle",
      }, "−1");
      add(boundPlot, "text", {
        x: truthPositiveX, y: truthY - 14, class: "energy-plot-note", "text-anchor": "middle",
      }, "+1");
      add(boundPlot, "text", {
        x: predictionLowX, y: predictionY + 21, class: "energy-plot-note", "text-anchor": "middle",
      }, formatSigned(model.predictionLow));
      add(boundPlot, "text", {
        x: predictionHighX, y: predictionY + 21, class: "energy-plot-note", "text-anchor": "middle",
      }, formatSigned(model.predictionHigh));

      const meterX = 60;
      const meterWidth = 480;
      const meterMax = 0.72;
      const distanceWidth = Math.min(meterWidth, (distance / meterMax) * meterWidth);
      const scoreWidth = Math.min(meterWidth, (reconstruction / meterMax) * meterWidth);
      add(boundPlot, "text", { x: meterX, y: 186, class: "energy-bound-value" }, isFailure
        ? "Mean mismatch at α = 2"
        : "Prediction–truth mismatch");
      add(boundPlot, "text", {
        x: 580, y: 186, class: "energy-bound-value", "text-anchor": "end",
      }, formatMetric(distance));
      add(boundPlot, "rect", {
        x: meterX, y: 196, width: meterWidth, height: 14, rx: 2, class: "energy-bound-meter-track",
      });
      if (distanceWidth > 0) {
        add(boundPlot, "rect", {
          x: meterX, y: 196, width: distanceWidth, height: 14, rx: 2, class: "energy-bound-meter-distance",
        });
      }
      const lossLabel = add(boundPlot, "text", { x: meterX, y: 250, class: "energy-bound-value" });
      add(lossLabel, "tspan", {}, "Training reconstruction loss ");
      add(lossLabel, "tspan", { "font-style": "italic" }, "ℒ");
      add(lossLabel, "tspan", {
        class: "energy-bound-loss-subscript",
        "baseline-shift": "sub",
      }, "ES");
      add(boundPlot, "text", {
        x: 580, y: 250, class: "energy-bound-value", "text-anchor": "end",
      }, formatMetric(reconstruction));
      add(boundPlot, "rect", {
        x: meterX, y: 260, width: meterWidth, height: 14, rx: 2, class: "energy-bound-meter-track",
      });
      add(boundPlot, "rect", {
        x: meterX,
        y: 260,
        width: scoreWidth,
        height: 14,
        rx: 2,
        class: "energy-bound-meter-bound",
      });
    };

    const contourFrame = {
      left: 70,
      top: 30,
      size: 280,
      lowMin: -1.4,
      lowMax: -0.3,
      highMin: 0.3,
      highMax: 1.4,
    };
    const contourLevels = [0, 0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.225, 0.325, 0.5];
    const contourColors = [
      "#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4",
      "#1d91c0", "#225ea8", "#253494", "#081d58",
    ];
    const contourRgb = contourColors.map((color) => [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
    ]);
    const contourX = (value) => contourFrame.left
      + ((value - contourFrame.lowMin) / (contourFrame.lowMax - contourFrame.lowMin)) * contourFrame.size;
    const contourY = (value) => contourFrame.top
      + ((contourFrame.highMax - value) / (contourFrame.highMax - contourFrame.highMin)) * contourFrame.size;
    const contourBand = (value) => {
      const index = contourLevels.findIndex((level, levelIndex) => (
        levelIndex < contourLevels.length - 1
        && value >= level
        && value < contourLevels[levelIndex + 1]
      ));
      return index < 0 ? contourColors.length - 1 : index;
    };
    const starPath = (centerX, centerY, outerRadius = 8, innerRadius = 3.5) => {
      const points = [];
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 ? innerRadius : outerRadius;
        const angle = -Math.PI / 2 + (index * Math.PI) / 5;
        points.push([
          centerX + radius * Math.cos(angle),
          centerY + radius * Math.sin(angle),
        ]);
      }
      return `${points.map(([xValue, yValue], index) => (
        `${index ? "L" : "M"}${xValue.toFixed(2)},${yValue.toFixed(2)}`
      )).join(" ")} Z`;
    };

    let contourDescription = null;
    let contourSelectionLayer = null;

    const drawContourSelection = (alpha, isFailure) => {
      if (!contourSelectionLayer) return;
      contourSelectionLayer.replaceChildren();
      const low = model.predictionLow;
      const high = model.predictionHigh;
      const selectedValue = relativeGeneralizedEnergyReconstruction(low, high, alpha);
      const selectedX = contourX(low);
      const selectedY = contourY(high);
      const truthX = contourX(-1);
      const truthY = contourY(1);
      const isExactMatch = Math.abs(low + 1) < 1e-12 && Math.abs(high - 1) < 1e-12;

      if (!isExactMatch) {
        add(contourSelectionLayer, "line", {
          x1: selectedX,
          y1: selectedY,
          x2: truthX,
          y2: truthY,
          class: "energy-contour-path",
        });
      }
      add(contourSelectionLayer, "circle", {
        cx: selectedX,
        cy: selectedY,
        r: isExactMatch ? 11 : 6.5,
        class: `energy-contour-selected${isExactMatch ? " energy-contour-selected--exact" : ""}`,
      });
      if (contourDescription) {
        contourDescription.textContent = `At alpha ${alpha.toFixed(3)}, the contour color shows prediction–truth mismatch. The selected prediction is ${low} and ${high}, with mismatch ${formatMetric(selectedValue)}.`;
      }
    };

    const drawGeneralizedEnergyContour = (alpha, isFailure) => {
      lossPlot.replaceChildren();
      add(lossPlot, "title", { id: "energy-loss-title" }, "Prediction–truth mismatch landscape over two predicted values");
      contourDescription = add(lossPlot, "desc", { id: "energy-loss-desc" });

      const canvas = document.createElement("canvas");
      const resolution = 180;
      canvas.width = resolution;
      canvas.height = resolution;
      const context = canvas.getContext("2d");
      if (context) {
        const imageData = context.createImageData(resolution, resolution);
        for (let row = 0; row < resolution; row += 1) {
          const high = contourFrame.highMax
            - ((row + 0.5) / resolution) * (contourFrame.highMax - contourFrame.highMin);
          for (let column = 0; column < resolution; column += 1) {
            const low = contourFrame.lowMin
              + ((column + 0.5) / resolution) * (contourFrame.lowMax - contourFrame.lowMin);
            const value = relativeGeneralizedEnergyReconstruction(low, high, alpha);
            const [red, green, blue] = contourRgb[contourBand(value)];
            const offset = (row * resolution + column) * 4;
            imageData.data[offset] = red;
            imageData.data[offset + 1] = green;
            imageData.data[offset + 2] = blue;
            imageData.data[offset + 3] = 255;
          }
        }
        context.putImageData(imageData, 0, 0);
        add(lossPlot, "image", {
          x: contourFrame.left,
          y: contourFrame.top,
          width: contourFrame.size,
          height: contourFrame.size,
          href: canvas.toDataURL("image/png"),
          preserveAspectRatio: "none",
          class: "energy-contour-image",
        });
      }

      const contourSamples = 91;
      const sampleValues = Array.from({ length: contourSamples }, (_, row) => {
        const high = contourFrame.highMax
          - (row / (contourSamples - 1)) * (contourFrame.highMax - contourFrame.highMin);
        return Array.from({ length: contourSamples }, (_, column) => {
          const low = contourFrame.lowMin
            + (column / (contourSamples - 1)) * (contourFrame.lowMax - contourFrame.lowMin);
          return relativeGeneralizedEnergyReconstruction(low, high, alpha);
        });
      });
      const cases = {
        1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]],
        5: [[0, 1], [2, 3]], 6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]],
        9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]],
        13: [[0, 1]], 14: [[0, 3]],
      };
      const interpolateEdge = (edge, points, values, threshold) => {
        const edgeCorners = [[0, 1], [1, 2], [2, 3], [3, 0]];
        const [startIndex, endIndex] = edgeCorners[edge];
        const startValue = values[startIndex];
        const endValue = values[endIndex];
        const denominator = endValue - startValue;
        const amount = Math.abs(denominator) < 1e-12
          ? 0.5
          : Math.max(0, Math.min(1, (threshold - startValue) / denominator));
        return [
          points[startIndex][0] + amount * (points[endIndex][0] - points[startIndex][0]),
          points[startIndex][1] + amount * (points[endIndex][1] - points[startIndex][1]),
        ];
      };
      contourLevels.slice(1, -1).forEach((threshold) => {
        const segments = [];
        for (let row = 0; row < contourSamples - 1; row += 1) {
          const y0 = contourFrame.top + (row / (contourSamples - 1)) * contourFrame.size;
          const y1 = contourFrame.top + ((row + 1) / (contourSamples - 1)) * contourFrame.size;
          for (let column = 0; column < contourSamples - 1; column += 1) {
            const x0 = contourFrame.left + (column / (contourSamples - 1)) * contourFrame.size;
            const x1 = contourFrame.left + ((column + 1) / (contourSamples - 1)) * contourFrame.size;
            const values = [
              sampleValues[row][column],
              sampleValues[row][column + 1],
              sampleValues[row + 1][column + 1],
              sampleValues[row + 1][column],
            ];
            const points = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
            const caseIndex = values.reduce((mask, value, index) => (
              mask | (value >= threshold ? 1 << index : 0)
            ), 0);
            (cases[caseIndex] || []).forEach(([startEdge, endEdge]) => {
              const startPoint = interpolateEdge(startEdge, points, values, threshold);
              const endPoint = interpolateEdge(endEdge, points, values, threshold);
              segments.push(
                `M${startPoint[0].toFixed(2)},${startPoint[1].toFixed(2)}`
                + `L${endPoint[0].toFixed(2)},${endPoint[1].toFixed(2)}`,
              );
            });
          }
        }
        if (segments.length) {
          add(lossPlot, "path", {
            d: segments.join(" "),
            class: "energy-contour-line",
          });
        }
      });

      [-1.4, -1.2, -1, -0.8, -0.6, -0.4].forEach((tick) => {
        add(lossPlot, "line", {
          x1: contourX(tick),
          y1: contourFrame.top,
          x2: contourX(tick),
          y2: contourFrame.top + contourFrame.size,
          class: "energy-contour-grid",
        });
        add(lossPlot, "text", {
          x: contourX(tick),
          y: contourFrame.top + contourFrame.size + 17,
          class: "energy-plot-tick",
          "text-anchor": "middle",
        }, tick.toFixed(1).replace("-", "−"));
      });
      [0.4, 0.6, 0.8, 1, 1.2, 1.4].forEach((tick) => {
        add(lossPlot, "line", {
          x1: contourFrame.left,
          y1: contourY(tick),
          x2: contourFrame.left + contourFrame.size,
          y2: contourY(tick),
          class: "energy-contour-grid",
        });
        add(lossPlot, "text", {
          x: contourFrame.left - 8,
          y: contourY(tick) + 3,
          class: "energy-plot-tick",
          "text-anchor": "end",
        }, tick.toFixed(1));
      });
      add(lossPlot, "rect", {
        x: contourFrame.left,
        y: contourFrame.top,
        width: contourFrame.size,
        height: contourFrame.size,
        class: "energy-contour-frame",
      });
      add(lossPlot, "text", {
        x: contourFrame.left + contourFrame.size / 2,
        y: 366,
        class: "energy-plot-label",
        "text-anchor": "middle",
      }, "lower prediction û−");
      add(lossPlot, "text", {
        x: 18,
        y: contourFrame.top + contourFrame.size / 2,
        class: "energy-plot-label",
        "text-anchor": "middle",
        transform: `rotate(-90 18 ${contourFrame.top + contourFrame.size / 2})`,
      }, "upper prediction û+");

      if (isFailure) {
        add(lossPlot, "line", {
          x1: contourX(-1.4),
          y1: contourY(1.4),
          x2: contourX(-0.3),
          y2: contourY(0.3),
          class: "energy-contour-valley",
        });
      }

      const truthX = contourX(-1);
      const truthY = contourY(1);
      add(lossPlot, "path", {
        d: starPath(truthX, truthY),
        class: "energy-contour-truth",
      });
      add(lossPlot, "text", {
        x: truthX,
        y: truthY - 12,
        class: "energy-contour-truth-label",
        "text-anchor": "middle",
      }, "truth");

      const colorbar = { x: 390, y: 94, width: 15, height: 142 };
      const colorbarY = (value) => colorbar.y + colorbar.height * (1 - value / 0.5);
      contourLevels.slice(0, -1).forEach((level, index) => {
        const upper = contourLevels[index + 1];
        add(lossPlot, "rect", {
          x: colorbar.x,
          y: colorbarY(upper),
          width: colorbar.width,
          height: colorbarY(level) - colorbarY(upper) + 0.5,
          fill: contourColors[index],
        });
      });
      add(lossPlot, "rect", {
        x: colorbar.x,
        y: colorbar.y,
        width: colorbar.width,
        height: colorbar.height,
        class: "energy-contour-colorbar-frame",
      });
      [0, 0.1, 0.25, 0.5].forEach((tick) => {
        add(lossPlot, "line", {
          x1: colorbar.x + colorbar.width,
          y1: colorbarY(tick),
          x2: colorbar.x + colorbar.width + 4,
          y2: colorbarY(tick),
          class: "energy-contour-colorbar-tick",
        });
        add(lossPlot, "text", {
          x: colorbar.x + colorbar.width + 8,
          y: colorbarY(tick) + 3,
          class: "energy-plot-tick",
        }, tick === 0 ? "0" : tick.toFixed(2));
      });
      contourSelectionLayer = add(lossPlot, "g", { "data-energy-contour-selection": "" });
      drawContourSelection(alpha, isFailure);
    };

    const regimeFor = (alpha, isFailure) => {
      if (isFailure) return "At α = 2, every prediction with the correct mean is a minimum.";
      if (alpha < 0.9995) return "For 0 < α < 1, the loss is nonconvex but has a unique minimum at the truth.";
      if (alpha < 1.0005) return "At α = 1, the loss uses unsquared distances.";
      return "For 1 < α < 2, the loss has a unique minimum at the truth.";
    };

    const updateAlpha = (announce = false, redrawLandscape = true) => {
      const alpha = Number.parseFloat(alphaInput.value);
      const isFailure = Math.abs(alpha - 2) < 0.0005;
      const regime = regimeFor(alpha, isFailure);
      alphaOutput.textContent = alpha.toFixed(3);
      regimeOutput.textContent = regime;
      selectedPairOutput.textContent = `{${formatSigned(model.predictionLow)}, ${formatSigned(model.predictionHigh)}}`;
      relativeOutput.textContent = formatMetric(relativeGeneralizedEnergyReconstruction(
        model.predictionLow,
        model.predictionHigh,
        alpha,
      ));
      interactive.classList.toggle("is-alpha-failure", isFailure);
      const progress = ((alpha - model.alphaMin) / (model.alphaMax - model.alphaMin)) * 100;
      alphaInput.style.setProperty("--range-progress", `${progress.toFixed(2)}%`);
      alphaInput.setAttribute(
        "aria-valuetext",
        isFailure
          ? "alpha 2; mismatch depends only on the prediction mean"
          : `alpha ${alpha.toFixed(3)}; ${regime}`,
      );
      drawBound(alpha, isFailure);
      if (redrawLandscape) drawGeneralizedEnergyContour(alpha, isFailure);
      else drawContourSelection(alpha, isFailure);
      if (announce && status) {
        const pair = `${formatSigned(model.predictionLow)} and ${formatSigned(model.predictionHigh)}`;
        const relativeValue = relativeGeneralizedEnergyReconstruction(
          model.predictionLow,
          model.predictionHigh,
          alpha,
        );
        status.textContent = isFailure
          ? `Using prediction ${pair}. Alpha equals two; mean mismatch is ${formatMetric(relativeValue)}, and the landscape is mean-only.`
          : `Using prediction ${pair}. Alpha ${alpha.toFixed(3)}. Prediction–truth mismatch is ${formatMetric(relativeValue)}. ${regime}`;
      }
    };

    updateAlpha();
    let alphaAnimationFrame = 0;
    let alphaAnnouncementTimer = 0;
    alphaInput.addEventListener("input", () => {
      window.cancelAnimationFrame(alphaAnimationFrame);
      alphaAnimationFrame = window.requestAnimationFrame(() => updateAlpha());
    });
    alphaInput.addEventListener("change", () => {
      window.cancelAnimationFrame(alphaAnimationFrame);
      updateAlpha();
      window.clearTimeout(alphaAnnouncementTimer);
      alphaAnnouncementTimer = window.setTimeout(() => updateAlpha(true), 450);
    });
    predictionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        model.predictionLow = Number.parseFloat(button.dataset.low);
        model.predictionHigh = Number.parseFloat(button.dataset.high);
        predictionButtons.forEach((candidate) => {
          candidate.setAttribute("aria-pressed", String(candidate === button));
        });
        updateAlpha(true, false);
      });
    });
  };

  if (energyRoot) {
    try {
      initEnergyDemo(energyRoot);
    } catch (error) {
      console.error("The interactive population energy figure could not be initialized.", error);
    }
  }

  const forecastAnimationGalleries = [
    ...document.querySelectorAll("[data-forecast-animation-gallery]"),
  ];

  const setForecastGalleryAnimation = (root, shouldPlay) => {
    const images = [...root.querySelectorAll(
      "img[data-forecast-static-src][data-forecast-animated-src]",
    )];

    images.forEach((image) => {
      const selectablePanel = image.closest("[data-deterministic-panel], [data-lorenz-draw-panel]");
      const isVisible = !selectablePanel || !selectablePanel.hidden;
      const useAnimatedSource = shouldPlay && isVisible;
      const nextSource = useAnimatedSource
        ? `${image.dataset.forecastAnimatedSrc}?v=forecast-media-5`
        : image.dataset.forecastStaticSrc;
      image.dataset.forecastMedia = useAnimatedSource ? "animated" : "static";
      if (image.getAttribute("src") !== nextSource) image.src = nextSource;
    });

    root.dataset.animationRunning = String(shouldPlay);
  };

  forecastAnimationGalleries.forEach((root) => {
    setForecastGalleryAnimation(root, !reducedMotion.matches);
  });

  reducedMotion.addEventListener?.("change", () => {
    forecastAnimationGalleries.forEach((root) => {
      setForecastGalleryAnimation(root, !reducedMotion.matches);
    });
  });

  const deterministicGallery = document.querySelector("[data-deterministic-gallery]");

  if (deterministicGallery) {
    const datasetTabs = Array.from(deterministicGallery.querySelectorAll("[data-deterministic-dataset]"));
    const datasetPanels = Array.from(deterministicGallery.querySelectorAll("[data-deterministic-panel]"));
    const comparisonScroll = deterministicGallery.querySelector(".forecast-comparison-scroll");

    const selectDeterministicDataset = (selectedTab, shouldFocus = false) => {
      const selectedPanelId = selectedTab.getAttribute("aria-controls");

      datasetTabs.forEach((tab) => {
        const isSelected = tab === selectedTab;
        tab.setAttribute("aria-selected", String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
      });

      datasetPanels.forEach((panel) => {
        panel.hidden = panel.id !== selectedPanelId;
      });

      setForecastGalleryAnimation(
        deterministicGallery,
        deterministicGallery.dataset.animationRunning === "true",
      );

      if (comparisonScroll) comparisonScroll.scrollLeft = 0;
      if (shouldFocus) selectedTab.focus();
    };

    datasetTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectDeterministicDataset(tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();

        let nextIndex = index;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + datasetTabs.length) % datasetTabs.length;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % datasetTabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = datasetTabs.length - 1;
        selectDeterministicDataset(datasetTabs[nextIndex], true);
      });
    });

    const linkedPanelId = window.location.hash.slice(1);
    const linkedTab = datasetTabs.find((tab) => tab.getAttribute("aria-controls") === linkedPanelId);
    const initialTab = linkedTab || datasetTabs.find((tab) => tab.getAttribute("aria-selected") === "true") || datasetTabs[0];
    if (initialTab) selectDeterministicDataset(initialTab);
  }

  const lorenzSampleGallery = document.querySelector("[data-lorenz-sample-gallery]");

  if (lorenzSampleGallery) {
    const drawButtons = Array.from(lorenzSampleGallery.querySelectorAll("[data-lorenz-draw]"));
    const drawPanels = Array.from(lorenzSampleGallery.querySelectorAll("[data-lorenz-draw-panel]"));
    const matrix = lorenzSampleGallery.querySelector(".lorenz-comparison-matrix");
    const comparisonScroll = lorenzSampleGallery.querySelector(".forecast-comparison-scroll");
    const status = lorenzSampleGallery.querySelector("[data-lorenz-sample-status]");

    const selectLorenzDraw = (selectedButton) => {
      const selectedDraw = selectedButton.dataset.lorenzDraw;
      const showAll = selectedDraw === "all";

      drawButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button === selectedButton));
      });
      drawPanels.forEach((panel) => {
        panel.hidden = !showAll && panel.dataset.lorenzDrawPanel !== selectedDraw;
      });
      matrix?.classList.toggle("is-showing-all", showAll);

      setForecastGalleryAnimation(
        lorenzSampleGallery,
        lorenzSampleGallery.dataset.animationRunning === "true",
      );
      if (comparisonScroll) comparisonScroll.scrollLeft = 0;
      if (status) {
        status.textContent = showAll
          ? `Showing all ${drawPanels.length} draws.`
          : `Showing draw ${selectedDraw} of ${drawPanels.length}.`;
      }
    };

    drawButtons.forEach((button) => {
      button.addEventListener("click", () => selectLorenzDraw(button));
    });

    const initialButton = drawButtons.find((button) => button.getAttribute("aria-pressed") === "true") || drawButtons[0];
    if (initialButton) selectLorenzDraw(initialButton);
  }

  const copyButton = document.querySelector("[data-copy-citation]");
  const copyStatus = document.querySelector("[data-copy-status]");
  const citation = document.getElementById("bibtex");

  const legacyCopy = (text) => {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  };

  copyButton?.addEventListener("click", async () => {
    if (!citation) return;
    const label = copyButton.querySelector("span");
    let copied = false;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(citation.textContent.trim());
        copied = true;
      } else {
        copied = legacyCopy(citation.textContent.trim());
      }
    } catch {
      copied = legacyCopy(citation.textContent.trim());
    }

    if (!label) return;
    const original = label.textContent;
    label.textContent = copied ? "Copied" : "Select text";
    if (copyStatus) {
      copyStatus.textContent = copied
        ? "BibTeX citation copied to the clipboard."
        : "Copy failed. Select the citation text manually.";
    }
    window.setTimeout(() => {
      label.textContent = original;
      if (copyStatus) copyStatus.textContent = "";
    }, 1800);
  });
})();
