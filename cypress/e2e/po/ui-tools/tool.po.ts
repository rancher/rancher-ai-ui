import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import ListOptionsPo from '@/cypress/e2e/po/components/list-options.po';

export default class ToolPo extends ComponentPo {
  suggestions(index: number) {
    return new ListOptionsPo(index);
  }

  selectOption(index: number) {
    return new ListOptionsPo(index);
  }

  explore(route: string) {
    return this.self().find(`[data-testid="rancher-ai-ui-tool-explore-${ route }"]`);
  }

  openConsoleLogs(cluster: string, namespace: string, name: string, containerName: string) {
    return this.self().find(`[data-testid="rancher-ai-ui-tool-open-console-logs-${ cluster }-${ namespace }-${ name }-${ containerName }"]`);
  }

  showYaml(resourceKind: string, resourceNamespace: string, resourceName: string) {
    return this.self().find(`[data-testid="rancher-ai-ui-tool-show-yaml-${ resourceKind }-${ resourceNamespace }-${ resourceName }"]`);
  }

  showYamlDiff(resourceKind: string, resourceNamespace: string, resourceName: string) {
    return this.self().find(`[data-testid="rancher-ai-ui-tool-show-yaml-diff-${ resourceKind }-${ resourceNamespace }-${ resourceName }"]`);
  }
}