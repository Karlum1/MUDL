export const INSTALL_GATE_BOOT = `(function(){try{var ua=navigator.userAgent||"";var ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);var android=/Android/i.test(ua);var standalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;if((ios||android)&&!standalone){document.documentElement.setAttribute("data-install-gate","1");}}catch(e){}})();`;

export function installGateActive() {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-install-gate") === "1";
}
