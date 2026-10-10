import UIKit
import Capacitor
import AuthenticationServices

@objc(CosmoraAuthPlugin)
public class CosmoraAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "CosmoraAuthPlugin"
    public let jsName = "CosmoraAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]
    private var authSession: ASWebAuthenticationSession?

    @objc func authenticate(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw),
              url.scheme == "https", url.host == "pwdpwgonvnuwmgfiidut.supabase.co",
              url.path == "/auth/v1/authorize", url.user == nil, url.password == nil,
              url.port == nil, url.fragment == nil else {
            call.reject("Indirizzo di accesso non valido.")
            return
        }
        let redirects = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?
            .filter { $0.name == "redirect_to" } ?? []
        let callbacks = ["com.kreluna.cosmora://auth/callback", "it.kreluna.cosmora://auth/callback"]
        guard redirects.count == 1, let destination = redirects.first?.value,
              callbacks.contains(destination), let callbackScheme = URL(string: destination)?.scheme else {
            call.reject("Destinazione di accesso non valida.")
            return
        }
        DispatchQueue.main.async { [self] in
            guard self.authSession == nil, self.bridge?.viewController?.view.window != nil else {
                call.reject("Accesso già in corso o app non disponibile.")
                return
            }
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callback, error in
                DispatchQueue.main.async {
                    self?.authSession = nil
                    guard error == nil, let callback = callback,
                          callback.scheme == callbackScheme, callback.host == "auth",
                          callback.path == "/callback", callback.port == nil,
                          callback.user == nil, callback.password == nil else {
                        call.reject("Accesso annullato o non completato. Riprova.")
                        return
                    }
                    call.resolve(["url": callback.absoluteString])
                }
            }
            session.presentationContextProvider = self
            self.authSession = session
            if !session.start() {
                self.authSession = nil
                call.reject("Impossibile aprire l’accesso Apple.")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}

final class COSMORABridgeViewController: CAPBridgeViewController {
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
    override var shouldAutorotate: Bool { false }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(CosmoraAuthPlugin())
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = COSMORABridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
