export const getRegistryProjectUrl = (registry, projectId) => {
  if (!projectId) return null;
  switch (registry) {
    case 'Verra':
      return `https://registry.verra.org/app/projectDetail/VCS/${String(projectId).replace(/^VCS/, '')}`;
    case 'Gold Standard':
      return `https://registry.goldstandard.org/projects?q=${projectId}`;
    case 'CAR':
      return `https://thereserve2.apx.com/mymodule/reg/prjView.asp?id1=${String(projectId).replace(/^CAR/, '')}`;
    case 'ACR':
      return `https://acr2.apx.com/mymodule/reg/prjView.asp?id1=${String(projectId).replace(/^ACR/, '')}`;
    default:
      return null;
  }
};
