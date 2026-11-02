import FBSDKCoreKit
import UIKit

enum MetaAppEvents {
    static let appID = "1609311830149459"
    private(set) static var isStarted = false

    static func start(
        application: UIApplication,
        launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) {
        let token = (Bundle.main.object(forInfoDictionaryKey: "FacebookClientToken") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard isConfigured(token) else {
            NSLog("Meta App Events skipped: client token is not configured.")
            return
        }

        Settings.shared.appID = appID
        Settings.shared.clientToken = token
        Settings.shared.displayName = "COSMORA"
        Settings.shared.isAutoLogAppEventsEnabled = true
        Settings.shared.isAdvertiserIDCollectionEnabled = true
        ApplicationDelegate.shared.application(
            application,
            didFinishLaunchingWithOptions: launchOptions
        )
        isStarted = true
        NSLog("Meta App Events started for app %@", appID)
    }

    static func handle(url: URL) -> Bool {
        guard isStarted else { return false }
        return ApplicationDelegate.shared.application(
            UIApplication.shared,
            open: url,
            sourceApplication: nil,
            annotation: [UIApplication.OpenURLOptionsKey.annotation]
        )
    }

    static func isConfigured(_ token: String) -> Bool {
        let value = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard value.count >= 16,
              !value.hasPrefix("REPLACE"),
              !value.hasPrefix("YOUR_"),
              !value.hasPrefix("$(") else {
            return false
        }
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "_-"))
        return value.rangeOfCharacter(from: allowed.inverted) == nil
    }
}
