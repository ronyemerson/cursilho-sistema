export function getToken() {
  return (
    localStorage.getItem("cursilho_token") ||
    sessionStorage.getItem("cursilho_token")
  );
}

export function logout() {
  localStorage.removeItem("cursilho_token");
  sessionStorage.removeItem("cursilho_token");
}
